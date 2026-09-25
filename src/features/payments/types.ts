export interface Payment {
  id: string;
  bakery_id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  idempotency_key: string | null;
  paid_at: string;
  created_at: string;
}

export interface CreatePaymentDTO {
  order_id: string;
  amount: number;
  payment_method: string;
  reference?: string | null;
  idempotency_key: string;
}
