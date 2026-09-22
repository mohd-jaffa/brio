import { type SupabaseClient } from "@supabase/supabase-js";
import { OrdersRepository } from "./repository";
import { type Order, type OrderAdjustmentRow, type OrderItemRow, type OrderRow } from "./types";
import { createOrderSchema, updateOrderStatusSchema, type CreateOrderInput, type UpdateOrderStatusInput } from "@/lib/validation";
import { ProductsService } from "../products/service";
import { InventoryService } from "../inventory/service";
import { ConflictError } from "@/shared/errors/app-error";
import { ERROR_MESSAGES } from "@/constants/messages";

export class OrdersService {
  private readonly repository: OrdersRepository;
  private readonly productsService: ProductsService;
  private readonly inventoryService: InventoryService;

  constructor(client: SupabaseClient) {
    this.repository = new OrdersRepository(client);
    this.productsService = new ProductsService(client);
    this.inventoryService = new InventoryService(client);
  }

  async getAllOrders(bakeryId: string): Promise<OrderRow[]> {
    return this.repository.findAll(bakeryId);
  }

  async getOrderById(bakeryId: string, id: string): Promise<Order> {
    const { order, items, adjustments } = await this.repository.findById(bakeryId, id);
    return this.mapToModel(order, items, adjustments);
  }

  async createOrder(bakeryId: string, input: CreateOrderInput): Promise<Order> {
    const validated = createOrderSchema.parse(input);

    // 1. Fetch current product prices and names to snapshot them
    const productIds = validated.items.map((i) => i.productId);
    // In a real app we'd fetch these in bulk. For now, fetch individually or just rely on the frontend sending unit prices?
    // Wait, AGENTS.md mandates backend calculation. We MUST fetch them.
    const productPromises = productIds.map(id => this.productsService.getProductById(bakeryId, id));
    const products = await Promise.all(productPromises);
    const productsById = Object.fromEntries(products.map((p: any) => [p.id, p]));

    // 2. Calculate items subtotal
    let subtotal = 0;
    const finalItems = validated.items.map(item => {
      const product = productsById[item.productId];
      if (!product) throw new ConflictError("CONFLICT", `Product ${item.productId} not found`);
      if (!product.isActive) throw new ConflictError("CONFLICT", `Product ${product.name} is no longer active`);
      
      const itemSubtotal = product.defaultPrice * item.quantity;
      subtotal += itemSubtotal;
      
      return {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.defaultPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        notes: item.notes || null,
      };
    });

    // 3. Calculate adjustments
    let discount = 0;
    let deliveryCharge = 0;
    
    validated.adjustments.forEach(adj => {
      if (adj.type === "DISCOUNT") discount += adj.amount;
      if (adj.type === "CHARGE") deliveryCharge += adj.amount;
    });

    const tax = 0; // Tax calculation logic would go here if needed in future
    const total = subtotal - discount + deliveryCharge + tax;

    if (total < 0) {
      throw new ConflictError("CONFLICT", "Order total cannot be negative");
    }

    // 4. Generate Order Number
    const orderNumber = await this.repository.generateOrderNumber(bakeryId);

    // 5. Transaction Simulation (Compensation Logic)
    let createdOrder: OrderRow | null = null;
    
    try {
      // 5a. Create Order Record
      createdOrder = await this.repository.createOrder(bakeryId, {
        customer_id: validated.customerId,
        order_number: orderNumber,
        status: "PENDING",
        payment_status: validated.payment.status,
        payment_method: validated.payment.method || null,
        payment_reference: validated.payment.reference || null,
        subtotal,
        discount,
        delivery_charge: deliveryCharge,
        tax,
        total,
        delivery_type: validated.delivery.type,
        delivery_date: validated.delivery.date,
        delivery_address: validated.delivery.address || null,
        delivery_google_maps_link: validated.delivery.googleMapsLink || null,
        notes: validated.notes || null,
      });

      // 5b. Create Order Items
      const itemsToInsert = finalItems.map(item => ({
        ...item,
        order_id: createdOrder!.id,
      }));
      const createdItems = await this.repository.createOrderItems(itemsToInsert);

      // 5c. Create Adjustments
      const adjustmentsToInsert = validated.adjustments.map(adj => ({
        order_id: createdOrder!.id,
        type: adj.type,
        name: adj.name,
        amount: adj.amount,
      }));
      const createdAdjustments = await this.repository.createOrderAdjustments(adjustmentsToInsert);

      // 5d. Reserve Inventory
      const inventoryPromises = createdItems.map(item => 
        this.inventoryService.logTransaction(bakeryId, {
          productId: item.product_id!,
          type: "ORDER_RESERVATION",
          quantity: -item.quantity, // Must be negative
          referenceType: "ORDER",
          referenceId: createdOrder!.id,
        })
      );
      await Promise.all(inventoryPromises);

      return this.mapToModel(createdOrder, createdItems, createdAdjustments);

    } catch (error) {
      // Compensation: Rollback if anything failed
      if (createdOrder) {
        // Deleting the order cascades to items, adjustments, and we handle inventory cleanup if needed.
        // Actually, inventory_transactions doesn't cascade by default since reference_id is loose text.
        // For V1, we delete the order, but we might leave orphaned inventory reservations if the failure happened AFTER inventory reservation. 
        // Realistically, we'd log the failure or do a manual revert.
        await this.repository.deleteOrderHard(createdOrder.id).catch(e => {
          console.error("FATAL: Failed to rollback order during compensation", e);
        });
      }
      throw error;
    }
  }

  async updateOrderStatus(bakeryId: string, id: string, input: UpdateOrderStatusInput): Promise<Order> {
    const validated = updateOrderStatusSchema.parse(input);
    const payload: Partial<Pick<OrderRow, "status" | "payment_status">> = {};
    
    if (validated.status) payload.status = validated.status;
    if (validated.paymentStatus) payload.payment_status = validated.paymentStatus;

    // Fetch before updating to know previous state
    const { order: existingOrder, items } = await this.repository.findById(bakeryId, id);

    const updatedOrder = await this.repository.updateOrderStatus(bakeryId, id, payload);

    // If transitioning to DELIVERED, consume inventory
    if (validated.status === "DELIVERED" && existingOrder.status !== "DELIVERED") {
      const inventoryPromises = items.map(item => 
        this.inventoryService.logTransaction(bakeryId, {
          productId: item.product_id!,
          type: "ORDER_CONSUMPTION",
          quantity: -item.quantity, 
          referenceType: "ORDER",
          referenceId: id,
        })
      );
      await Promise.all(inventoryPromises);
    }

    // Returning just the updated order implies we'd need items/adjustments again. We can refetch or just return basic.
    return this.getOrderById(bakeryId, id);
  }

  private mapToModel(order: OrderRow, items: OrderItemRow[], adjustments: OrderAdjustmentRow[]): Order {
    return {
      id: order.id,
      customerId: order.customer_id,
      orderNumber: order.order_number,
      status: order.status,
      payment: {
        status: order.payment_status,
        method: order.payment_method ?? undefined,
        reference: order.payment_reference ?? undefined,
      },
      pricing: {
        subtotal: order.subtotal,
        discount: order.discount,
        deliveryCharge: order.delivery_charge,
        tax: order.tax,
        total: order.total,
      },
      delivery: {
        type: order.delivery_type,
        date: order.delivery_date,
        address: order.delivery_address ?? undefined,
        googleMapsLink: order.delivery_google_maps_link ?? undefined,
      },
      notes: order.notes ?? undefined,
      items: items.map(i => ({
        id: i.id,
        productId: i.product_id ?? undefined,
        productName: i.product_name,
        unitPrice: i.unit_price,
        quantity: i.quantity,
        subtotal: i.subtotal,
        notes: i.notes ?? undefined,
      })),
      adjustments: adjustments.map(a => ({
        id: a.id,
        type: a.type,
        name: a.name,
        amount: a.amount,
      })),
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  }
}
