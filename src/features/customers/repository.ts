import { type SupabaseClient } from "@supabase/supabase-js";
import { type CustomerRow } from "./types";
import { ConflictError, ExternalServiceError, NotFoundError } from "@/shared/errors/app-error";
import { ERROR_MESSAGES } from "@/constants/messages";

export class CustomersRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findAll(bakeryId: string): Promise<CustomerRow[]> {
    const { data, error } = await this.client
      .from("customers")
      .select("*")
      .eq("bakery_id", bakeryId)
      .order("name");

    if (error) {
      throw this.mapDatabaseError(error);
    }

    return data as CustomerRow[];
  }

  async findById(bakeryId: string, id: string): Promise<CustomerRow> {
    const { data, error } = await this.client
      .from("customers")
      .select("*")
      .eq("bakery_id", bakeryId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw this.mapDatabaseError(error);
    }

    if (!data) {
      throw new NotFoundError("NOT_FOUND", "Customer not found");
    }

    return data as CustomerRow;
  }

  async create(bakeryId: string, payload: Partial<CustomerRow>): Promise<CustomerRow> {
    const { data, error } = await this.client
      .from("customers")
      .insert({ ...payload, bakery_id: bakeryId })
      .select()
      .single();

    if (error) {
      throw this.mapDatabaseError(error);
    }

    return data as CustomerRow;
  }

  async update(bakeryId: string, id: string, payload: Partial<CustomerRow>): Promise<CustomerRow> {
    const { data, error } = await this.client
      .from("customers")
      .update(payload)
      .eq("bakery_id", bakeryId)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throw this.mapDatabaseError(error);
    }

    if (!data) {
      throw new NotFoundError("NOT_FOUND", "Customer not found");
    }

    return data as CustomerRow;
  }

  private mapDatabaseError(error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message).toLowerCase()
        : "";

    if (message.includes("unique") && message.includes("phone")) {
      return new ConflictError(
        "CONFLICT",
        "A customer with this phone number already exists for this bakery."
      );
    }

    return new ExternalServiceError("EXTERNAL_SERVICE_ERROR", undefined, error);
  }
}
