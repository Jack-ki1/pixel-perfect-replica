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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      artist_notes: {
        Row: {
          artist_id: string
          author_id: string
          author_name: string | null
          body: string
          created_at: string
          id: string
        }
        Insert: {
          artist_id: string
          author_id?: string
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          artist_id?: string
          author_id?: string
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_notes_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          aliases: string[]
          artistic_status: string
          audience_current: number
          canonical_id: string
          city: string
          country: string
          created_at: string
          events: Json
          evidence: Json
          evidence_confidence: number
          expected_growth_30d: number
          genre: string
          growth_30d: number
          id: string
          integrity: Database["public"]["Enums"]["integrity_class"]
          is_demo: boolean
          language: string
          name: string
          next_action: string | null
          next_action_due: string | null
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"]
          portrait_seed: number
          scores: Json
          scout_owner: string | null
          series: Json
          stage: string
          unsigned: boolean
          updated_at: string
          why_now: string | null
        }
        Insert: {
          aliases?: string[]
          artistic_status?: string
          audience_current: number
          canonical_id: string
          city: string
          country: string
          created_at?: string
          events?: Json
          evidence?: Json
          evidence_confidence: number
          expected_growth_30d: number
          genre: string
          growth_30d: number
          id?: string
          integrity?: Database["public"]["Enums"]["integrity_class"]
          is_demo?: boolean
          language: string
          name: string
          next_action?: string | null
          next_action_due?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          portrait_seed?: number
          scores?: Json
          scout_owner?: string | null
          series?: Json
          stage: string
          unsigned?: boolean
          updated_at?: string
          why_now?: string | null
        }
        Update: {
          aliases?: string[]
          artistic_status?: string
          audience_current?: number
          canonical_id?: string
          city?: string
          country?: string
          created_at?: string
          events?: Json
          evidence?: Json
          evidence_confidence?: number
          expected_growth_30d?: number
          genre?: string
          growth_30d?: number
          id?: string
          integrity?: Database["public"]["Enums"]["integrity_class"]
          is_demo?: boolean
          language?: string
          name?: string
          next_action?: string | null
          next_action_due?: string | null
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"]
          portrait_seed?: number
          scores?: Json
          scout_owner?: string | null
          series?: Json
          stage?: string
          unsigned?: boolean
          updated_at?: string
          why_now?: string | null
        }
        Relationships: []
      }
      audience_snapshots: {
        Row: {
          artist_id: string
          id: string
          reference_date: string
          segments: Json
          source: string
          total: number
          window_days: number
        }
        Insert: {
          artist_id: string
          id?: string
          reference_date: string
          segments: Json
          source: string
          total: number
          window_days: number
        }
        Update: {
          artist_id?: string
          id?: string
          reference_date?: string
          segments?: Json
          source?: string
          total?: number
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "audience_snapshots_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "head_of_ar" | "scout" | "analyst" | "artist_dev"
      integrity_class:
        | "organic"
        | "paid_promo"
        | "unknown"
        | "suspicious"
        | "confirmed_invalid"
      pipeline_stage:
        | "identified"
        | "watchlist"
        | "investigation"
        | "artistic_review"
        | "contact"
        | "live_audition"
        | "development"
        | "negotiation"
        | "signed"
        | "passed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "head_of_ar", "scout", "analyst", "artist_dev"],
      integrity_class: [
        "organic",
        "paid_promo",
        "unknown",
        "suspicious",
        "confirmed_invalid",
      ],
      pipeline_stage: [
        "identified",
        "watchlist",
        "investigation",
        "artistic_review",
        "contact",
        "live_audition",
        "development",
        "negotiation",
        "signed",
        "passed",
      ],
    },
  },
} as const
