import { supabase } from "@/integrations/supabase/client";
import { STATUS_LOCATION, STATUS_LABELS } from "@/lib/statusTransitions";

interface ChangeStatusParams {
  osId: string;
  osCodigo: string;
  fromStatus: string;
  toStatus: string;
  userName: string;
}

export async function changeOSStatus({ osId, osCodigo, fromStatus, toStatus, userName }: ChangeStatusParams) {
  const localizacao = STATUS_LOCATION[toStatus] || "CD";

  const { error } = await supabase
    .from("ordens_servico")
    .update({
      status: toStatus,
      localizacao,
      updated_at: new Date().toISOString(),
    })
    .eq("id", osId);

  if (error) throw error;

  // Log to activity_logs
  await supabase.from("activity_logs").insert({
    action: "mudanca_status",
    entity_type: "ordens_servico",
    entity_id: osId,
    entity_description: osCodigo,
    user_name: userName,
    details: {
      de: STATUS_LABELS[fromStatus] || fromStatus,
      para: STATUS_LABELS[toStatus] || toStatus,
    },
  });
}
