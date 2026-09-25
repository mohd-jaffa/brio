import type { Tenant } from "@/lib/supabase/tenant";
import { type Order, type OrderRow } from "./types";
import { type CreateOrderPayload } from "@/lib/validation";
import { MAX_ORDER_TOTAL_PAISE } from "@/constants/limits";
import { businessRuleError, conflictError } from "@/lib/errors";
import { getCustomerById } from "@/features/customers/api";
import { getProductById } from "@/features/products/api";
import { logInventoryTransaction } from "@/features/inventory/api";
import { logActionSafe } from "@/lib/audit/auditLog";
import { generateOrderNumber, insertOrder, insertOrderItems, insertOrderAdjustments, deleteOrderHard } from "./api";
import { mapToOrderModel } from "./mappers";
import { orderTotals } from "./totals";

export async function createOrder(
  tenant: Tenant,
  input: CreateOrderPayload,
): Promise<Order> {
  // A saved customer is read back through this business's records, so one that
  // belongs to another business is refused here as not found — not left to a
  // foreign key, and never stored (BUG-19). A Guest has nothing to read.
  const customerId = input.customer.kind === "CUSTOMER" ? input.customer.id : null;
  if (customerId) await getCustomerById(tenant, customerId);

  // Every product is read back: the prices the order is built from are the
  // ones in the database now, never the ones the browser sent (AGENTS.md §13).
  const products = await Promise.all(
    input.items.map((item) => getProductById(tenant, item.productId)),
  );
  const productsById = new Map(products.map((product) => [product.id, product]));

  const finalItems = input.items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) throw conflictError("CONFLICT", { reason: "product_not_found", productId: item.productId });
    if (!product.isActive) throw conflictError("CONFLICT", { reason: "product_inactive", productId: item.productId });

    return {
      product_id: product.id,
      product_name: product.name,
      unit_price: product.defaultPrice,
      quantity: item.quantity,
      subtotal: product.defaultPrice * item.quantity,
      notes: item.notes,
    };
  });

  // The same formula the checkout screen previews with (./totals), worked out
  // again here from the prices just read back: the client is never trusted for
  // what an order comes to (AGENTS.md §13).
  const { subtotal, discount, deliveryCharge, tax, total } = orderTotals(
    finalItems.map((item) => ({ unitPrice: item.unit_price, quantity: item.quantity })),
    input.adjustments,
  );

  if (total < 0) {
    throw conflictError("CONFLICT", { reason: "negative_order_total" });
  }
  // Each field is bounded, but enough lines of them are not; the stored
  // totals must fit their integer columns (BUG-12).
  if (subtotal > MAX_ORDER_TOTAL_PAISE || total > MAX_ORDER_TOTAL_PAISE) {
    throw businessRuleError("ORDER_TOTAL_TOO_LARGE", { subtotal, total });
  }

  const orderNumber = await generateOrderNumber(tenant);

  let createdOrder: OrderRow | null = null;
  
  try {
    createdOrder = await insertOrder(tenant, {
      customer_id: customerId,
      order_number: orderNumber,
      status: "PENDING",
      payment_status: input.payment.status,
      payment_method: input.payment.method ?? null,
      payment_reference: input.payment.reference,
      subtotal,
      discount,
      delivery_charge: deliveryCharge,
      tax,
      total,
      delivery_type: input.delivery.type,
      delivery_date: input.delivery.date,
      delivery_address: input.delivery.address,
      delivery_google_maps_link: input.delivery.googleMapsLink,
      notes: input.notes,
    });

    const itemsToInsert = finalItems.map(item => ({
      ...item,
      order_id: createdOrder!.id,
    }));
    const createdItems = await insertOrderItems(tenant, itemsToInsert);

    const adjustmentsToInsert = input.adjustments.map(adj => ({
      order_id: createdOrder!.id,
      type: adj.type,
      name: adj.name,
      amount: adj.amount,
    }));
    const createdAdjustments = await insertOrderAdjustments(tenant, adjustmentsToInsert);

    const inventoryPromises = createdItems.map(item => 
      logInventoryTransaction(tenant, {
        productId: item.product_id!,
        type: "ORDER_RESERVATION",
        quantity: -item.quantity,
        referenceType: "ORDER",
        referenceId: createdOrder!.id,
      })
    );
    await Promise.all(inventoryPromises);

    // Every other change to an order was audited; its creation was not (AGENTS.md §11).
    await logActionSafe(tenant, {
      action: "CREATE",
      entity_type: "orders",
      entity_id: createdOrder.id,
      new_data: createdOrder as unknown as Record<string, unknown>,
    });

    return mapToOrderModel(createdOrder, createdItems, createdAdjustments);

  } catch (error) {
    if (createdOrder) {
      await deleteOrderHard(tenant, createdOrder.id).catch(e => {
        console.error("FATAL: Failed to rollback order during compensation", e);
      });
    }
    throw error;
  }
}
