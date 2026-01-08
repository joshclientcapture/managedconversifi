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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          access_token: string | null
          calendly_event_id: string | null
          calendly_event_uri: string | null
          calendly_invitee_uri: string | null
          call_outcome: string | null
          cancel_url: string | null
          client_connection_id: string
          closer_notes: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          event_status: string | null
          event_time: string | null
          event_type: string | null
          event_type_name: string | null
          event_type_uri: string | null
          id: string
          raw_payload: Json | null
          reschedule_url: string | null
          showed_up: boolean | null
        }
        Insert: {
          access_token?: string | null
          calendly_event_id?: string | null
          calendly_event_uri?: string | null
          calendly_invitee_uri?: string | null
          call_outcome?: string | null
          cancel_url?: string | null
          client_connection_id: string
          closer_notes?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          event_status?: string | null
          event_time?: string | null
          event_type?: string | null
          event_type_name?: string | null
          event_type_uri?: string | null
          id?: string
          raw_payload?: Json | null
          reschedule_url?: string | null
          showed_up?: boolean | null
        }
        Update: {
          access_token?: string | null
          calendly_event_id?: string | null
          calendly_event_uri?: string | null
          calendly_invitee_uri?: string | null
          call_outcome?: string | null
          cancel_url?: string | null
          client_connection_id?: string
          closer_notes?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          event_status?: string | null
          event_time?: string | null
          event_type?: string | null
          event_type_name?: string | null
          event_type_uri?: string | null
          id?: string
          raw_payload?: Json | null
          reschedule_url?: string | null
          showed_up?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_connection_id_fkey"
            columns: ["client_connection_id"]
            isOneToOne: false
            referencedRelation: "client_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_stats: {
        Row: {
          acceptance_rate: number | null
          access_token: string | null
          campaign_data: Json | null
          client_connection_id: string
          connections_made: number | null
          created_at: string | null
          date: string
          id: string
          meetings_booked: number | null
          messages_sent: number | null
          pending_requests: number | null
          replies_received: number | null
          response_rate: number | null
          total_prospects: number | null
          total_responses: number | null
          total_sent: number | null
        }
        Insert: {
          acceptance_rate?: number | null
          access_token?: string | null
          campaign_data?: Json | null
          client_connection_id: string
          connections_made?: number | null
          created_at?: string | null
          date: string
          id?: string
          meetings_booked?: number | null
          messages_sent?: number | null
          pending_requests?: number | null
          replies_received?: number | null
          response_rate?: number | null
          total_prospects?: number | null
          total_responses?: number | null
          total_sent?: number | null
        }
        Update: {
          acceptance_rate?: number | null
          access_token?: string | null
          campaign_data?: Json | null
          client_connection_id?: string
          connections_made?: number | null
          created_at?: string | null
          date?: string
          id?: string
          meetings_booked?: number | null
          messages_sent?: number | null
          pending_requests?: number | null
          replies_received?: number | null
          response_rate?: number | null
          total_prospects?: number | null
          total_responses?: number | null
          total_sent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stats_client_connection_id_fkey"
            columns: ["client_connection_id"]
            isOneToOne: false
            referencedRelation: "client_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      client_connections: {
        Row: {
          access_token: string | null
          calendly_org_uri: string
          calendly_token: string
          calendly_user_uri: string
          calendly_webhook_id: string | null
          client_name: string
          conversifi_webhook_url: string | null
          created_at: string | null
          discord_channel_id: string | null
          discord_channel_name: string | null
          discord_enabled: boolean | null
          discord_guild_id: string | null
          discord_guild_name: string | null
          discord_webhook_url: string | null
          ghl_api_key: string | null
          ghl_location_id: string
          ghl_location_name: string
          id: string
          is_active: boolean | null
          slack_channel_id: string | null
          slack_channel_name: string | null
          updated_at: string | null
          watched_event_types: Json | null
        }
        Insert: {
          access_token?: string | null
          calendly_org_uri: string
          calendly_token: string
          calendly_user_uri: string
          calendly_webhook_id?: string | null
          client_name: string
          conversifi_webhook_url?: string | null
          created_at?: string | null
          discord_channel_id?: string | null
          discord_channel_name?: string | null
          discord_enabled?: boolean | null
          discord_guild_id?: string | null
          discord_guild_name?: string | null
          discord_webhook_url?: string | null
          ghl_api_key?: string | null
          ghl_location_id: string
          ghl_location_name: string
          id?: string
          is_active?: boolean | null
          slack_channel_id?: string | null
          slack_channel_name?: string | null
          updated_at?: string | null
          watched_event_types?: Json | null
        }
        Update: {
          access_token?: string | null
          calendly_org_uri?: string
          calendly_token?: string
          calendly_user_uri?: string
          calendly_webhook_id?: string | null
          client_name?: string
          conversifi_webhook_url?: string | null
          created_at?: string | null
          discord_channel_id?: string | null
          discord_channel_name?: string | null
          discord_enabled?: boolean | null
          discord_guild_id?: string | null
          discord_guild_name?: string | null
          discord_webhook_url?: string | null
          ghl_api_key?: string | null
          ghl_location_id?: string
          ghl_location_name?: string
          id?: string
          is_active?: boolean | null
          slack_channel_id?: string | null
          slack_channel_name?: string | null
          updated_at?: string | null
          watched_event_types?: Json | null
        }
        Relationships: []
      }
      kanban_boards: {
        Row: {
          created_at: string | null
          id: string
          name: string
          password: string | null
          position: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          password?: string | null
          position?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          password?: string | null
          position?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_boards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "kanban_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_card_attachments: {
        Row: {
          card_id: string
          created_at: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          card_id: string
          created_at?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_card_attachments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "kanban_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_card_comments: {
        Row: {
          author_id: string | null
          card_id: string
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          author_id?: string | null
          card_id: string
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string | null
          card_id?: string
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_card_comments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "kanban_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_cards: {
        Row: {
          column_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number | null
          priority: string | null
          title: string
          webhook_triggered: boolean | null
        }
        Insert: {
          column_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          priority?: string | null
          title: string
          webhook_triggered?: boolean | null
        }
        Update: {
          column_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          priority?: string | null
          title?: string
          webhook_triggered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          board_id: string
          created_at: string | null
          id: string
          name: string
          position: number | null
          webhook_trigger_mode: string | null
          webhook_url: string | null
        }
        Insert: {
          board_id: string
          created_at?: string | null
          id?: string
          name: string
          position?: number | null
          webhook_trigger_mode?: string | null
          webhook_url?: string | null
        }
        Update: {
          board_id?: string
          created_at?: string | null
          id?: string
          name?: string
          position?: number | null
          webhook_trigger_mode?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_workspaces: {
        Row: {
          created_at: string | null
          id: string
          name: string
          password: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          password?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          password?: string | null
        }
        Relationships: []
      }
      onboarding_submissions: {
        Row: {
          blacklist_urls: string | null
          city_state: string
          company_headcounts: Json | null
          company_name: string
          country: string
          created_at: string
          deal_size: string | null
          email: string
          file_urls: Json | null
          first_name: string
          geography: string | null
          has_calendly: string
          id: string
          ideal_client: string | null
          industries: string | null
          industry: string
          job_titles: string | null
          last_name: string
          linkedin_url: string
          phone: string
          problem_solved: string | null
          sales_person: string | null
          service_description: string | null
          street_address: string
          success_stories: string | null
          updated_at: string
          website_url: string
        }
        Insert: {
          blacklist_urls?: string | null
          city_state: string
          company_headcounts?: Json | null
          company_name: string
          country: string
          created_at?: string
          deal_size?: string | null
          email: string
          file_urls?: Json | null
          first_name: string
          geography?: string | null
          has_calendly: string
          id?: string
          ideal_client?: string | null
          industries?: string | null
          industry: string
          job_titles?: string | null
          last_name: string
          linkedin_url: string
          phone: string
          problem_solved?: string | null
          sales_person?: string | null
          service_description?: string | null
          street_address: string
          success_stories?: string | null
          updated_at?: string
          website_url: string
        }
        Update: {
          blacklist_urls?: string | null
          city_state?: string
          company_headcounts?: Json | null
          company_name?: string
          country?: string
          created_at?: string
          deal_size?: string | null
          email?: string
          file_urls?: Json | null
          first_name?: string
          geography?: string | null
          has_calendly?: string
          id?: string
          ideal_client?: string | null
          industries?: string | null
          industry?: string
          job_titles?: string | null
          last_name?: string
          linkedin_url?: string
          phone?: string
          problem_solved?: string | null
          sales_person?: string | null
          service_description?: string | null
          street_address?: string
          success_stories?: string | null
          updated_at?: string
          website_url?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          client_connection_id: string
          created_at: string
          id: string
          report_date: string
          report_name: string
          report_url: string
        }
        Insert: {
          client_connection_id: string
          created_at?: string
          id?: string
          report_date: string
          report_name: string
          report_url: string
        }
        Update: {
          client_connection_id?: string
          created_at?: string
          id?: string
          report_date?: string
          report_name?: string
          report_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_client_connection_id_fkey"
            columns: ["client_connection_id"]
            isOneToOne: false
            referencedRelation: "client_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_triggers: {
        Row: {
          card_id: string
          column_id: string
          id: string
          triggered_at: string | null
        }
        Insert: {
          card_id: string
          column_id: string
          id?: string
          triggered_at?: string | null
        }
        Update: {
          card_id?: string
          column_id?: string
          id?: string
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_triggers_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_triggers_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
