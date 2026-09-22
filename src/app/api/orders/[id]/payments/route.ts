import { withApiHandler, readJson } from "@/shared/api/handler";
import { processPayment, findPaymentsByOrderId } from "@/features/payments/api";
import { requireAuth } from "@/features/auth/guard";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(request, async () => {
    const session = await requireAuth(request);
    const { id } = await params;
    const client = createSupabaseServiceRoleClient();
    const body = await readJson(request);
    return processPayment(client, session.profile.bakeryId, { ...body, order_id: id });
  }, { successStatus: 201 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(request, async () => {
    const session = await requireAuth(request);
    const { id } = await params;
    const client = createSupabaseServiceRoleClient();
    return findPaymentsByOrderId(client, session.profile.bakeryId, id);
  });
}
