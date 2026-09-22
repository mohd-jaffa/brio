import { type SupabaseClient } from "@supabase/supabase-js";

export interface AnalyticsOverview {
  totalRevenue: number;
  totalOrders: number;
  totalExpenses: number;
  pendingPayments: number;
}

export async function getOverview(client: SupabaseClient, bakeryId: string): Promise<AnalyticsOverview> {
  const [ordersResult, expensesResult, paymentsResult] = await Promise.all([
    client
      .from("orders")
      .select("total, payment_status")
      .eq("bakery_id", bakeryId)
      .neq("status", "CANCELLED"),
    client
      .from("expenses")
      .select("amount")
      .eq("bakery_id", bakeryId),
    client
      .from("payments")
      .select("amount")
      .eq("bakery_id", bakeryId)
  ]);

  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (expensesResult.error) throw new Error(expensesResult.error.message);
  if (paymentsResult.error) throw new Error(paymentsResult.error.message);

  const orders = ordersResult.data || [];
  const expenses = expensesResult.data || [];
  
  // Revenue is the total amount of non-cancelled orders
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  
  // Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Pending payments = Total Revenue - Total Paid
  const totalPaid = (paymentsResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingPayments = Math.max(0, totalRevenue - totalPaid);

  return {
    totalRevenue,
    totalOrders,
    totalExpenses,
    pendingPayments
  };
}
