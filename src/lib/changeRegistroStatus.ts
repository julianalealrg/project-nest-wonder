import { supabase } from "@/integrations/supabase/client";
import { REGISTRO_STATUS_LABELS } from "@/lib/registroTransitions";

interface ChangeRegistroStatusParams {
  registroId: string;
  registroCodigo: string;
  fromStatus: string;
  toStatus: string;
  userName: string;
}

export async function changeRegistroStatus({ registroId, registroCodigo, fromStatus, toStatus, userName }: ChangeRegistroStatusParams) {
  const { error } = await supabase
    .from("registros")
    .update({
      status: toStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", registroId);

  if (error) throw error;

  await supabase.from("activity_logs").insert({
    action: "mudanca_status",
    entity_type: "registros",
    entity_id: registroId,
    entity_description: registroCodigo,
    user_name: userName,
    details: {
      de: REGISTRO_STATUS_LABELS[fromStatus] || fromStatus,
      para: REGISTRO_STATUS_LABELS[toStatus] || toStatus,
    },
  });
}
