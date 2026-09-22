import { type SupabaseClient } from "@supabase/supabase-js";
import { type Order, type OrderRow } from "./types";
import { type CreateOrderPayload } from "@/lib/validation";
import { conflictError } from "@/lib/errors";
import { getProductById } from "@/features/products/api";
import { logInventoryTransaction } from "@/features/inventory/api";
import { generateOrderNumber, insertOrder, insertOrderItems, insertOrderAdjustments, deleteOrderHard } from "./api";
import { mapToOrderModel } from "./mappers";
import { orderTotals } from "./totals";

export async function createOrder(
  client: SupabaseClient, 
  bakeryId: string, 
  input: CreateOrderPayload,
): Promise<Order> {
  // Every product is read back: the prices the order is built from are the
  // ones in the database now, never the ones the browser sent (AGENTS.md §13).
  const products = await Promise.all(
    input.items.map((item) => getProductById(client, bakeryId, item.productId)),
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

  const orderNumber = await generateOrderNumber(client, bakeryId);

  let createdOrder: OrderRow | null = null;
  
  try {
    createdOrder = await insertOrder(client, bakeryId, {
      customer_id: input.customerId,
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
    const createdItems = await insertOrderItems(client, itemsToInsert);

    const adjustmentsToInsert = input.adjustments.map(adj => ({
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
