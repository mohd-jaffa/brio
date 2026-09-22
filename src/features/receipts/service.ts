import { SupabaseClient } from "@supabase/supabase-js";
import { type ReceiptData } from "./types";
import { OrdersService } from "../orders/service";
import { PaymentsRepository } from "../payments/repository";

export class ReceiptsService {
  private readonly ordersService: OrdersService;
  private readonly paymentsRepository: PaymentsRepository;

  constructor(client: SupabaseClient) {
    this.ordersService = new OrdersService(client);
    this.paymentsRepository = new PaymentsRepository(client);
  }

  async generateReceiptData(bakeryId: string, orderId: string): Promise<ReceiptData> {
    // 1. Fetch order and items
    const order = await this.ordersService.getOrderById(bakeryId, orderId);

    // 2. Fetch payments
    const payments = await this.paymentsRepository.findByOrderId(bakeryId, orderId);

    // 3. Compose receipt data
    // (In a real application, bakeryName would come from the bakery profile)
    return {
      order,
      items: order.items || [],
      payments,
      bakeryName: "Ovenly Bakery", // Placeholder, since bakeries table isn't fully scaffolded with profile logic yet
      generatedAt: new Date().toISOString(),
    };
  }
}
