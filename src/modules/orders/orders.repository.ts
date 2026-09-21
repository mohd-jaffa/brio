import { type SupabaseClient } from "@supabase/supabase-js";
import { type OrderRow, type OrderItemRow, type OrderAdjustmentRow } from "./orders.types";
import { ExternalServiceError, NotFoundError } from "@/shared/errors/app-error";
import { ERROR_CODES } from "@/shared/constants/errors";

export class OrdersRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findAll(bakeryId: string): Promise<OrderRow[]> {
    const { data, error } = await this.client
      .from("orders")
      .select("*")
      .eq("bakery_id", bakeryId)
      .order("created_at", { ascending: false });

    if (error) {
      throw this.mapDatabaseError(error);
    }

    return data as OrderRow[];
  }

  async findById(bakeryId: string, id: string): Promise<{
    order: OrderRow;
    items: OrderItemRow[];
    adjustments: OrderAdjustmentRow[];
  }> {
    const { data: order, error: orderError } = await this.client
      .from("orders")
      .select("*")
      .eq("bakery_id", bakeryId)
      .eq("id", id)
      .maybeSingle();

    if (orderError) throw this.mapDatabaseError(orderError);
    if (!order) throw new NotFoundError(ERROR_CODES.NOT_FOUND, "Order not found");

    const [itemsResponse, adjustmentsResponse] = await Promise.all([
      this.client.from("order_items").select("*").eq("order_id", id),
      this.client.from("order_adjustments").select("*").eq("order_id", id),
    ]);

    if (itemsResponse.error) throw this.mapDatabaseError(itemsResponse.error);
    if (adjustmentsResponse.error) throw this.mapDatabaseError(adjustmentsResponse.error);

    return {
      order: order as OrderRow,
      items: itemsResponse.data as OrderItemRow[],
      adjustments: adjustmentsResponse.data as OrderAdjustmentRow[],
    };
  }

  async createOrder(bakeryId: string, payload: Omit<OrderRow, "id" | "bakery_id" | "created_at" | "updated_at">): Promise<OrderRow> {
    const { data, error } = await this.client
      .from("orders")
      .insert({ ...payload, bakery_id: bakeryId })
      .select()
      .single();

    if (error) throw this.mapDatabaseError(error);
    return data as OrderRow;
  }

  async createOrderItems(items: Omit<OrderItemRow, "id" | "created_at">[]): Promise<OrderItemRow[]> {
    if (items.length === 0) return [];
    const { data, error } = await this.client
      .from("order_items")
      .insert(items)
      .select();

    if (error) throw this.mapDatabaseError(error);
    return data as OrderItemRow[];
  }

  async createOrderAdjustments(adjustments: Omit<OrderAdjustmentRow, "id" | "created_at">[]): Promise<OrderAdjustmentRow[]> {
    if (adjustments.length === 0) return [];
    const { data, error } = await this.client
      .from("order_adjustments")
      .insert(adjustments)
      .select();

    if (error) throw this.mapDatabaseError(error);
    return data as OrderAdjustmentRow[];
  }

  async updateOrderStatus(
    bakeryId: string,
    id: string,
    payload: Partial<Pick<OrderRow, "status" | "payment_status">>
  ): Promise<OrderRow> {
    const { data, error } = await this.client
      .from("orders")
      .update(payload)
      .eq("bakery_id", bakeryId)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw this.mapDatabaseError(error);
    if (!data) throw new NotFoundError(ERROR_CODES.NOT_FOUND, "Order not found");

    return data as OrderRow;
  }

  async deleteOrderHard(id: string): Promise<void> {
    // Used exclusively for compensation logic
    await this.client.from("orders").delete().eq("id", id);
  }

  async generateOrderNumber(bakeryId: string): Promise<string> {
    // In a real system, we'd use a sequence or counter table to avoid gaps.
    // For V1, we get the count of orders + 1 and prefix with #.
    // Concurrency could create duplicates (unique constraint would throw).
    const { count, error } = await this.client
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("bakery_id", bakeryId);

    if (error) throw this.mapDatabaseError(error);
    
    // We add a timestamp component to reduce collision chance in basic implementation
    const baseNumber = (count ?? 0) + 1;
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `#${baseNumber}-${randomSuffix}`;
  }

  private mapDatabaseError(error: unknown) {
    return new ExternalServiceError(ERROR_CODES.EXTERNAL_SERVICE_ERROR, undefined, error);
  }
}
