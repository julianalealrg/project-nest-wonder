export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          contato: string | null
          created_at: string
          endereco: string | null
          id: string
          nome: string
          supervisor: string | null
        }
        Insert: {
          contato?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          supervisor?: string | null
        }
        Update: {
          contato?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          supervisor?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      evidencias: {
        Row: {
          created_at: string
          id: string
          registro_id: string
          url_foto: string
        }
        Insert: {
          created_at?: string
          id?: string
          registro_id: string
          url_foto: string
        }
        Update: {
          created_at?: string
          id?: string
          registro_id?: string
          url_foto?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidencias_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          ambiente: string | null
          area_m2: number | null
          area_m2_manual: boolean
          cliente_id: string | null
          codigo: string
          created_at: string
          data_emissao: string | null
          data_entrega: string | null
          entregue_bypass_por: string | null
          entregue_confirmado_em: string | null
          entregue_confirmado_por: string | null
          entregue_sem_foto_justificativa: string | null
          foto_entrega_url: string | null
          id: string
          localizacao: string | null
          material: string | null
          material_disponivel: boolean | null
          material_solicitado_cd: boolean | null
          origem: string
          pdf_url: string | null
          projetista: string | null
          registro_origem_id: string | null
          status: string
          terceiro_id: string | null
          terceiro_nome: string | null
          updated_at: string
        }
        Insert: {
          ambiente?: string | null
          area_m2?: number | null
          area_m2_manual?: boolean
          cliente_id?: string | null
          codigo: string
          created_at?: string
          data_emissao?: string | null
          data_entrega?: string | null
          entregue_bypass_por?: string | null
          entregue_confirmado_em?: string | null
          entregue_confirmado_por?: string | null
          entregue_sem_foto_justificativa?: string | null
          foto_entrega_url?: string | null
          id?: string
          localizacao?: string | null
          material?: string | null
          material_disponivel?: boolean | null
          material_solicitado_cd?: boolean | null
          origem?: string
          pdf_url?: string | null
          projetista?: string | null
          registro_origem_id?: string | null
          status?: string
          terceiro_id?: string | null
          terceiro_nome?: string | null
          updated_at?: string
        }
        Update: {
          ambiente?: string | null
          area_m2?: number | null
          area_m2_manual?: boolean
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          data_emissao?: string | null
          data_entrega?: string | null
          entregue_bypass_por?: string | null
          entregue_confirmado_em?: string | null
          entregue_confirmado_por?: string | null
          entregue_sem_foto_justificativa?: string | null
          foto_entrega_url?: string | null
          id?: string
          localizacao?: string | null
          material?: string | null
          material_disponivel?: boolean | null
          material_solicitado_cd?: boolean | null
          origem?: string
          pdf_url?: string | null
          projetista?: string | null
          registro_origem_id?: string | null
          status?: string
          terceiro_id?: string | null
          terceiro_nome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_registro_origem_id_fkey"
            columns: ["registro_origem_id"]
            isOneToOne: false
            referencedRelation: "registros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_terceiro_id_fkey"
            columns: ["terceiro_id"]
            isOneToOne: false
            referencedRelation: "terceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas: {
        Row: {
          acabador: string | null
          cabine: string | null
          comprimento: number | null
          cortador: string | null
          cq_aprovado: boolean | null
          cq_observacao: string | null
          cq_responsavel: string | null
          created_at: string
          descricao: string | null
          id: string
          item: string | null
          largura: number | null
          operador_45: string | null
          operador_poliborda: string | null
          operador_usinagem: string | null
          os_id: string
          precisa_45: boolean | null
          precisa_poliborda: boolean | null
          precisa_usinagem: boolean | null
          quantidade: number
          status_45: string | null
          status_acabamento: string | null
          status_corte: string | null
          status_cq: string | null
          status_poliborda: string | null
          status_usinagem: string | null
          updated_at: string
        }
        Insert: {
          acabador?: string | null
          cabine?: string | null
          comprimento?: number | null
          cortador?: string | null
          cq_aprovado?: boolean | null
          cq_observacao?: string | null
          cq_responsavel?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          item?: string | null
          largura?: number | null
          operador_45?: string | null
          operador_poliborda?: string | null
          operador_usinagem?: string | null
          os_id: string
          precisa_45?: boolean | null
          precisa_poliborda?: boolean | null
          precisa_usinagem?: boolean | null
          quantidade?: number
          status_45?: string | null
          status_acabamento?: string | null
          status_corte?: string | null
          status_cq?: string | null
          status_poliborda?: string | null
          status_usinagem?: string | null
          updated_at?: string
        }
        Update: {
          acabador?: string | null
          cabine?: string | null
          comprimento?: number | null
          cortador?: string | null
          cq_aprovado?: boolean | null
          cq_observacao?: string | null
          cq_responsavel?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          item?: string | null
          largura?: number | null
          operador_45?: string | null
          operador_poliborda?: string | null
          operador_usinagem?: string | null
          os_id?: string
          precisa_45?: boolean | null
          precisa_poliborda?: boolean | null
          precisa_usinagem?: boolean | null
          quantidade?: number
          status_45?: string | null
          status_acabamento?: string | null
          status_corte?: string | null
          status_cq?: string | null
          status_poliborda?: string | null
          status_usinagem?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pecas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          base: string
          created_at: string
          deve_trocar_senha: boolean
          email: string
          funcao: string | null
          id: string
          nome: string
          perfil: Database["public"]["Enums"]["app_role"]
          sobrenome: string | null
          status_aprovacao: string
          ultimo_acesso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base?: string
          created_at?: string
          deve_trocar_senha?: boolean
          email: string
          funcao?: string | null
          id?: string
          nome: string
          perfil?: Database["public"]["Enums"]["app_role"]
          sobrenome?: string | null
          status_aprovacao?: string
          ultimo_acesso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          base?: string
          created_at?: string
          deve_trocar_senha?: boolean
          email?: string
          funcao?: string | null
          id?: string
          nome?: string
          perfil?: Database["public"]["Enums"]["app_role"]
          sobrenome?: string | null
          status_aprovacao?: string
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registro_pecas: {
        Row: {
          descricao: string | null
          id: string
          item: string | null
          medida_atual: string | null
          medida_necessaria: string | null
          nao_consta_os: boolean | null
          quantidade: number | null
          registro_id: string
        }
        Insert: {
          descricao?: string | null
          id?: string
          item?: string | null
          medida_atual?: string | null
          medida_necessaria?: string | null
          nao_consta_os?: boolean | null
          quantidade?: number | null
          registro_id: string
        }
        Update: {
          descricao?: string | null
          id?: string
          item?: string | null
          medida_atual?: string | null
          medida_necessaria?: string | null
          nao_consta_os?: boolean | null
          quantidade?: number | null
          registro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registro_pecas_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros"
            referencedColumns: ["id"]
          },
        ]
      }
      registros: {
        Row: {
          aberto_por: string | null
          acabador_responsavel: string | null
          acao_produtiva: string | null
          ambiente: string | null
          cliente: string | null
          codigo: string
          created_at: string
          encaminhar_projetos: boolean | null
          id: string
          instrucao_projetos: string | null
          justificativa: string | null
          material: string | null
          material_disponivel: boolean | null
          numero_os: string | null
          origem: string
          os_gerada_id: string | null
          os_id: string | null
          projetista: string | null
          recolha_destino: string | null
          recolha_origem: string | null
          requer_recolha: boolean | null
          resolvido_em: string | null
          responsavel_erro_nome: string | null
          responsavel_erro_papel: string | null
          status: string
          supervisor: string | null
          tipo: string | null
          tipo_outro: string | null
          updated_at: string
          urgencia: string
        }
        Insert: {
          aberto_por?: string | null
          acabador_responsavel?: string | null
          acao_produtiva?: string | null
          ambiente?: string | null
          cliente?: string | null
          codigo: string
          created_at?: string
          encaminhar_projetos?: boolean | null
          id?: string
          instrucao_projetos?: string | null
          justificativa?: string | null
          material?: string | null
          material_disponivel?: boolean | null
          numero_os?: string | null
          origem: string
          os_gerada_id?: string | null
          os_id?: string | null
          projetista?: string | null
          recolha_destino?: string | null
          recolha_origem?: string | null
          requer_recolha?: boolean | null
          resolvido_em?: string | null
          responsavel_erro_nome?: string | null
          responsavel_erro_papel?: string | null
          status?: string
          supervisor?: string | null
          tipo?: string | null
          tipo_outro?: string | null
          updated_at?: string
          urgencia?: string
        }
        Update: {
          aberto_por?: string | null
          acabador_responsavel?: string | null
          acao_produtiva?: string | null
          ambiente?: string | null
          cliente?: string | null
          codigo?: string
          created_at?: string
          encaminhar_projetos?: boolean | null
          id?: string
          instrucao_projetos?: string | null
          justificativa?: string | null
          material?: string | null
          material_disponivel?: boolean | null
          numero_os?: string | null
          origem?: string
          os_gerada_id?: string | null
          os_id?: string | null
          projetista?: string | null
          recolha_destino?: string | null
          recolha_origem?: string | null
          requer_recolha?: boolean | null
          resolvido_em?: string | null
          responsavel_erro_nome?: string | null
          responsavel_erro_papel?: string | null
          status?: string
          supervisor?: string | null
          tipo?: string | null
          tipo_outro?: string | null
          updated_at?: string
          urgencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_os_gerada_id_fkey"
            columns: ["os_gerada_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      romaneio_pecas: {
        Row: {
          conferencia: string | null
          id: string
          observacao: string | null
          os_id: string | null
          peca_id: string
          romaneio_id: string
        }
        Insert: {
          conferencia?: string | null
          id?: string
          observacao?: string | null
          os_id?: string | null
          peca_id: string
          romaneio_id: string
        }
        Update: {
          conferencia?: string | null
          id?: string
          observacao?: string | null
          os_id?: string | null
          peca_id?: string
          romaneio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "romaneio_pecas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "romaneio_pecas_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "romaneio_pecas_romaneio_id_fkey"
            columns: ["romaneio_id"]
            isOneToOne: false
            referencedRelation: "romaneios"
            referencedColumns: ["id"]
          },
        ]
      }
      romaneios: {
        Row: {
          ajudante: string | null
          codigo: string
          conferido_entrada_em: string | null
          conferido_entrada_por: string | null
          conferido_saida_em: string | null
          conferido_saida_por: string | null
          created_at: string
          data_recebimento: string | null
          data_saida: string | null
          endereco_destino: string | null
          foto_romaneio_assinado_url: string | null
          id: string
          motorista: string | null
          observacoes: string | null
          pdf_url: string | null
          recebido_por: string | null
          status: string
          tipo_rota: string
        }
        Insert: {
          ajudante?: string | null
          codigo: string
          conferido_entrada_em?: string | null
          conferido_entrada_por?: string | null
          conferido_saida_em?: string | null
          conferido_saida_por?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_saida?: string | null
          endereco_destino?: string | null
          foto_romaneio_assinado_url?: string | null
          id?: string
          motorista?: string | null
          observacoes?: string | null
          pdf_url?: string | null
          recebido_por?: string | null
          status?: string
          tipo_rota: string
        }
        Update: {
          ajudante?: string | null
          codigo?: string
          conferido_entrada_em?: string | null
          conferido_entrada_por?: string | null
          conferido_saida_em?: string | null
          conferido_saida_por?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_saida?: string | null
          endereco_destino?: string | null
          foto_romaneio_assinado_url?: string | null
          id?: string
          motorista?: string | null
          observacoes?: string | null
          pdf_url?: string | null
          recebido_por?: string | null
          status?: string
          tipo_rota?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_lists: {
        Row: {
          created_at: string
          id: string
          tipo: string
          valor: string
        }
        Insert: {
          created_at?: string
          id?: string
          tipo: string
          valor: string
        }
        Update: {
          created_at?: string
          id?: string
          tipo?: string
          valor?: string
        }
        Relationships: []
      }
      terceiros: {
        Row: {
          contato: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          contato?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          contato?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalcular_area_os: { Args: { p_os_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "operador" | "observador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operador", "observador"],
    },
  },
} as const
