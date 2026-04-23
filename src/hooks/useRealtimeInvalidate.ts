import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeSubscription {
  table: string;
  queryKeys: string[][];
}

/**
 * Subscribes to Supabase realtime changes on the given tables and
 * invalidates the matching React Query keys whenever a change happens.
 *
 * Usage:
 *   useRealtimeInvalidate([
 *     { table: "registros", queryKeys: [["home-kpis"], ["registros"]] },
 *     { table: "ordens_servico", queryKeys: [["home-kpis"], ["ordens_servico"]] },
 *   ]);
 */
export function useRealtimeInvalidate(subscriptions: RealtimeSubscription[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels = subscriptions.map((sub) => {
      const channel = supabase
        .channel(`realtime-${sub.table}-${Math.random().toString(36).slice(2, 8)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: sub.table },
          () => {
            sub.queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }
        )
        .subscribe();
      return channel;
    });

    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
