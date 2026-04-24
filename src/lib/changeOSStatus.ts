import { supabase } from "@/integrations/supabase/client";
import { STATUS_LOCATION, STATUS_LABELS } from "@/lib/statusTransitions";

interface ChangeStatusParams {
  osId: string;
  osCodigo: string;
  fromStatus: string;
  toStatus: string;
  userName: string;
  extraFields?: Record<string, string>;
}

export async function changeOSStatus({ osId, osCodigo, fromStatus, toStatus, userName, extraFields = {} }: ChangeStatusParams) {
  const localizacao = STATUS_LOCATION[toStatus] || "CD";

  // Update OS status
  const osUpdate: Record<string, unknown> = {
    status: toStatus,
    localizacao,
    updated_at: new Date().toISOString(),
  };

  // Save terceiro info on OS if provided
  if (extraFields.terceiro) {
    // Store in activity log details (no dedicated column yet)
  }

  const { error } = await supabase
    .from("ordens_servico")
    .update(osUpdate as any)
    .eq("id", osId);

  if (error) throw error;

  // Se a OS foi gerada por um registro e foi entregue, marca o registro como resolvido
  if (toStatus === "entregue") {
    try {
      const { data: osRow } = await supabase
        .from("ordens_servico")
        .select("registro_origem_id")
        .eq("id", osId)
        .maybeSingle();
      const registroOrigemId = (osRow as any)?.registro_origem_id;
      if (registroOrigemId) {
        await supabase
          .from("registros")
          .update({
            status: "resolvido",
            resolvido_em: new Date().toISOString(),
          } as any)
          .eq("id", registroOrigemId);
      }
    } catch (e) {
      console.error("Falha ao resolver registro vinculado:", e);
      // não bloqueia a transição da OS
    }
  }

  // Update pecas with operator info if provided
  const pecaUpdate: Record<string, string> = {};
  if (extraFields.cortador) pecaUpdate.cortador = extraFields.cortador;
  if (extraFields.acabador) pecaUpdate.acabador = extraFields.acabador;
  if (extraFields.cabine) pecaUpdate.cabine = extraFields.cabine;
  if (extraFields.aprovado_por) {
    pecaUpdate.cq_responsavel = extraFields.aprovado_por;
    pecaUpdate.status_cq = "aprovado";
  }

  if (Object.keys(pecaUpdate).length > 0) {
    const { error: pecaError } = await supabase
      .from("pecas")
      .update(pecaUpdate as any)
      .eq("os_id", osId);
    if (pecaError) throw pecaError;
  }

  // Build details for activity log
  const details: Record<string, string> = {
    de: STATUS_LABELS[fromStatus] || fromStatus,
    para: STATUS_LABELS[toStatus] || toStatus,
    ...extraFields,
  };

  await supabase.from("activity_logs").insert({
    action: "mudanca_status",
    entity_type: "ordens_servico",
    entity_id: osId,
    entity_description: osCodigo,
    user_name: userName,
    details,
  });
}
