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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      conversation_prompt_usage: {
        Row: {
          id: string
          conversation_id: string
          prompt_id: string
          used_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          prompt_id: string
          used_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          prompt_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_prompt_usage_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_prompt_usage_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "deep_talk_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          match_id: string
          phase: string
          last_message_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          phase?: string
          last_message_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          phase?: string
          last_message_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      deep_talk_prompts: {
        Row: {
          id: string
          category: string
          prompt_text: string
          depth_level: number
          created_at: string
        }
        Insert: {
          id?: string
          category: string
          prompt_text: string
          depth_level?: number
          created_at?: string
        }
        Update: {
          id?: string
          category?: string
          prompt_text?: string
          depth_level?: number
          created_at?: string
        }
        Relationships: []
      }
      hobbies: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          a_seen_at: string | null
          b_seen_at: string | null
          created_at: string
          id: string
          profile_a_id: string
          profile_b_id: string
          status: string
          updated_at: string
        }
        Insert: {
          a_seen_at?: string | null
          b_seen_at?: string | null
          created_at?: string
          id?: string
          profile_a_id: string
          profile_b_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          a_seen_at?: string | null
          b_seen_at?: string | null
          created_at?: string
          id?: string
          profile_a_id?: string
          profile_b_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_profile_a_id_fkey"
            columns: ["profile_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_profile_b_id_fkey"
            columns: ["profile_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          message_type: string
          deep_talk_prompt_id: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          message_type?: string
          deep_talk_prompt_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          message_type?: string
          deep_talk_prompt_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_deep_talk_prompt_id_fkey"
            columns: ["deep_talk_prompt_id"]
            isOneToOne: false
            referencedRelation: "deep_talk_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_options: {
        Row: {
          created_at: string
          id: string
          option_order: number
          option_text: string
          option_value: string
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_order: number
          option_text: string
          option_value: string
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_order?: number
          option_text?: string
          option_value?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personality_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "personality_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_questions: {
        Row: {
          created_at: string
          id: string
          question: string
          question_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          question_order: number
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          question_order?: number
        }
        Relationships: []
      }
      profile_hobbies: {
        Row: {
          created_at: string
          hobby_id: string
          id: string
          intensity: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          hobby_id: string
          id?: string
          intensity: string
          profile_id: string
        }
        Update: {
          created_at?: string
          hobby_id?: string
          id?: string
          intensity?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_hobbies_hobby_id_fkey"
            columns: ["hobby_id"]
            isOneToOne: false
            referencedRelation: "hobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_hobbies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_interests: {
        Row: {
          created_at: string
          from_profile_id: string
          id: string
          status: string
          to_profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_profile_id: string
          id?: string
          status: string
          to_profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_profile_id?: string
          id?: string
          status?: string
          to_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_interests_from_profile_id_fkey"
            columns: ["from_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_interests_to_profile_id_fkey"
            columns: ["to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_personality_answers: {
        Row: {
          created_at: string
          id: string
          option_id: string
          profile_id: string
          question_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          profile_id: string
          question_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          profile_id?: string
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_personality_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "personality_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_personality_answers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_personality_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "personality_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_preferences: {
        Row: {
          created_at: string
          id: string
          max_age: number
          max_distance_km: number | null
          min_age: number
          preferred_genders: string[]
          profile_id: string
          relationship_intent: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_age?: number
          max_distance_km?: number | null
          min_age?: number
          preferred_genders?: string[]
          profile_id: string
          relationship_intent?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_age?: number
          max_distance_km?: number | null
          min_age?: number
          preferred_genders?: string[]
          profile_id?: string
          relationship_intent?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          bio: string | null
          city: string | null
          created_at: string
          first_name: string | null
          gender: string | null
          id: string
          looking_for: string[]
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          age?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string
          first_name?: string | null
          gender?: string | null
          id: string
          looking_for?: string[]
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          age?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          looking_for?: string[]
          onboarding_completed?: boolean
          updated_at?: string
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
    Enums: {},
  },
} as const
