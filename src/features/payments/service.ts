import { type SupabaseClient } from "@supabase/supabase-js";
import { PaymentsRepository } from "./repository";
import { OrdersRepository } from "../orders/repository";
import { type Payment } from "./types";
import { type CreatePaymentInput, createPaymentSchema } from "@/lib/validation";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { ERROR_MESSAGES } from "@/constants/messages";
import { AuditService } from "@/features/audit/service";
import { JobsRepository } from "@/features/workers/repository";

export class PaymentsService {
  private readonly repository: PaymentsRepository;
  private readonly ordersRepository: OrdersRepository;
  private readonly auditService: AuditService;
  private readonly jobsRepository: JobsRepository;

  constructor(client: SupabaseClient) {
    this.repository = new PaymentsRepository(client);
    this.ordersRepository = new OrdersRepository(client);
    this.auditService = new AuditService(client);
    this.jobsRepository = new JobsRepository(client);
  }

  async createPayment(bakeryId: string, payload: CreatePaymentInput): Promise<Payment> {
    const validated = createPaymentSchema.parse(payload);

    // 1. Verify the order exists and belongs to the bakery
    const orderData = await this.ordersRepository.findById(bakeryId, validated.order_id);
    if (!orderData) {
      throw new NotFoundError("RECORD_NOT_FOUND");
    }

    const order = orderData.order;

    const amountPaise = Math.round(validated.amount * 100);

    // 2. Fetch existing payments to calculate total paid
    const existingPayments = await this.repository.findByOrderId(bakeryId, validated.order_id);
    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

    // 3. Verify that the new payment doesn't exceed the total amount due
    if (totalPaid + amountPaise > order.total) {
      throw new ConflictError("CONFLICT", "Payment amount exceeds order total");
    }

    // 4. Create the payment
    const payment = await this.repository.create(bakeryId, {
      order_id: validated.order_id,
      amount: amountPaise,
      payment_method: validated.payment_method,
      reference: validated.reference,
    });

    // 5. Update order payment status
    const newTotalPaid = totalPaid + amountPaise;
    let newStatus = "PARTIALLY_PAID";
    if (newTotalPaid >= order.total) {
      newStatus = "PAID";
    }

    await this.ordersRepository.updateOrderStatus(bakeryId, validated.order_id, { payment_status: newStatus as any });

    await this.auditService.logAction({
      bakery_id: bakeryId,
      user_id: null,
      action: "CREATE",
      entity_type: "payments",
      entity_id: payment.id,
      new_data: payment as unknown as Record<string, any>,
    });

    await this.jobsRepository.create({
      type: "SEND_PUSH_NOTIFICATION",
      payload: {
        token: "mock-token", 
        payload: {
          title: "Payment Received",
          body: `Received ₹${validated.amount} for Order ${order.order_number}`
        }
      }
    });

    return payment;
  }

  async getPaymentsForOrder(bakeryId: string, orderId: string): Promise<Payment[]> {
    return this.repository.findByOrderId(bakeryId, orderId);
  }
}
