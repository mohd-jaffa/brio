import type { Tenant } from "@/lib/supabase/tenant";
import { type Order, type OrderRow } from "./types";
import { type CreateOrderPayload } from "@/lib/validation";
import { logInventoryTransaction } from "@/features/inventory/api";
import { logActionSafe } from "@/lib/audit/auditLog";
import { generateOrderNumber, insertOrder, insertOrderItems, insertOrderAdjustments, deleteOrderHard } from "./api";
import { mapToOrderModel } from "./mappers";
import { priceDraft } from "./pricing";

export async function createOrder(
  tenant: Tenant,
  input: CreateOrderPayload,
): Promise<Order> {
  const { customer, lines, totals } = await priceDraft(tenant, input);
  const { subtotal, discount, deliveryCharge, tax, total } = totals;

  const orderNumber = await generateOrderNumber(tenant);

  let createdOrder: OrderRow | null = null;
  
  try {
    createdOrder = await insertOrder(tenant, {
      customer_id: customer.kind === "CUSTOMER" ? customer.id : null,
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

    const itemsToInsert = lines.map((line) => ({
      order_id: createdOrder!.id,
      product_id: line.productId,
      product_name: line.name,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      subtotal: line.subtotal,
      notes: line.notes,
    }));
    const createdItems = await insertOrderItems(tenant, itemsToInsert);

    const adjustmentsToInsert = input.adjustments.map(adj => ({
      order_id: createdOrder!.id,
      type: adj.type,
      name: adj.name,
      amount: adj.amount,
    }));
    const createdAdjustments = await insertOrderAdjustments(tenant, adjustmentsToInsert);

    // A custom line has no product, and moves no stock (plan §139.11.7).
    const inventoryPromises = createdItems.flatMap((item) =>
      item.product_id === null
        ? []
        : [
            logInventoryTransaction(tenant, {
              productId: item.product_id,
              type: "ORDER_RESERVATION",
              quantity: -item.quantity,
              referenceType: "ORDER",
              referenceId: createdOrder!.id,
            }),
          ],
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
