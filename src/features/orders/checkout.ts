import { type SupabaseClient } from "@supabase/supabase-js";
import { type Order, type OrderRow } from "./types";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validation";
import { ConflictError } from "@/shared/errors/app-error";
import { getProductById } from "@/features/products/api";
import { logInventoryTransaction } from "@/features/inventory/api";
import { generateOrderNumber, insertOrder, insertOrderItems, insertOrderAdjustments, deleteOrderHard } from "./api";
import { mapToOrderModel } from "./mappers";

export async function createOrder(
  client: SupabaseClient, 
  bakeryId: string, 
  input: CreateOrderInput
): Promise<Order> {
  const validated = createOrderSchema.parse(input);

  const productIds = validated.items.map((i) => i.productId);
  const productPromises = productIds.map(id => getProductById(client, bakeryId, id));
  const products = await Promise.all(productPromises);
  const productsById = Object.fromEntries(products.map((p: any) => [p.id, p]));

  let subtotal = 0;
  const finalItems = validated.items.map(item => {
    const product = productsById[item.productId];
    if (!product) throw new ConflictError("CONFLICT", `Product \${item.productId} not found`);
    if (!product.isActive) throw new ConflictError("CONFLICT", `Product \${product.name} is no longer active`);
    
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

  let discount = 0;
  let deliveryCharge = 0;
  
  validated.adjustments.forEach(adj => {
    if (adj.type === "DISCOUNT") discount += adj.amount;
    if (adj.type === "CHARGE") deliveryCharge += adj.amount;
  });

  const tax = 0;
  const total = subtotal - discount + deliveryCharge + tax;

  if (total < 0) {
    throw new ConflictError("CONFLICT", "Order total cannot be negative");
  }

  const orderNumber = await generateOrderNumber(client, bakeryId);

  let createdOrder: OrderRow | null = null;
  
  try {
    createdOrder = await insertOrder(client, bakeryId, {
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

    const itemsToInsert = finalItems.map(item => ({
      ...item,
      order_id: createdOrder!.id,
    }));
    const createdItems = await insertOrderItems(client, itemsToInsert);

    const adjustmentsToInsert = validated.adjustments.map(adj => ({
      order_id: createdOrder!.id,
      type: adj.type,
      name: adj.name,
      amount: adj.amount,
    }));
    const createdAdjustments = await insertOrderAdjustments(client, adjustmentsToInsert);

    const inventoryPromises = createdItems.map(item => 
      logInventoryTransaction(client, bakeryId, {
        productId: item.product_id!,
        type: "ORDER_RESERVATION",
        quantity: -item.quantity,
        referenceType: "ORDER",
        referenceId: createdOrder!.id,
      })
    );
    await Promise.all(inventoryPromises);

    return mapToOrderModel(createdOrder, createdItems, createdAdjustments);

  } catch (error) {
    if (createdOrder) {
      await deleteOrderHard(client, createdOrder.id).catch(e => {
        console.error("FATAL: Failed to rollback order during compensation", e);
      });
    }
    throw error;
  }
}
