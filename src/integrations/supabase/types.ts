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
          client_connection_id: string
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
        }
        Insert: {
          access_token?: string | null
          calendly_event_id?: string | null
          calendly_event_uri?: string | null
          calendly_invitee_uri?: string | null
          client_connection_id: string
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
        }
        Update: {
          access_token?: string | null
          calendly_event_id?: string | null
          calendly_event_uri?: string | null
          calendly_invitee_uri?: string | null
          client_connection_id?: string
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
          access_token: string | null
          campaign_data: Json | null
          client_connection_id: string
          connections_made: number | null
          created_at: string | null
          date: string
          id: string
          meetings_booked: number | null
          messages_sent: number | null
          replies_received: number | null
        }
        Insert: {
          access_token?: string | null
          campaign_data?: Json | null
          client_connection_id: string
          connections_made?: number | null
          created_at?: string | null
          date: string
          id?: string
          meetings_booked?: number | null
          messages_sent?: number | null
          replies_received?: number | null
        }
        Update: {
          access_token?: string | null
          campaign_data?: Json | null
          client_connection_id?: string
          connections_made?: number | null
          created_at?: string | null
          date?: string
          id?: string
          meetings_booked?: number | null
          messages_sent?: number | null
          replies_received?: number | null
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
          ghl_api_key: string | null
          ghl_location_id: string
          ghl_location_name: string
          id: string
          is_active: boolean | null
          slack_channel_id: string
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
          ghl_api_key?: string | null
          ghl_location_id: string
          ghl_location_name: string
          id?: string
          is_active?: boolean | null
          slack_channel_id: string
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
          ghl_api_key?: string | null
          ghl_location_id?: string
          ghl_location_name?: string
          id?: string
          is_active?: boolean | null
          slack_channel_id?: string
          slack_channel_name?: string | null
          updated_at?: string | null
          watched_event_types?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
