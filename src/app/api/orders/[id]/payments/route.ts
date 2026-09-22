import { withApiHandler, readJson } from "@/shared/api/handler";
import { PaymentsService } from "@/features/payments/service";
import { requireAuth } from "@/features/auth/guard";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(request, async () => {
    const session = await requireAuth(request);
    const client = createSupabaseServiceRoleClient();
    const service = new PaymentsService(client);
    const body = await readJson(request);
    
    return service.createPayment(session.profile.bakeryId, { ...body, order_id: params.id });
  }, { successStatus: 201 });
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(request, async () => {
    const session = await requireAuth(request);
    const client = createSupabaseServiceRoleClient();
    const service = new PaymentsService(client);
    
    return service.getPaymentsForOrder(session.profile.bakeryId, params.id);
  });
}
