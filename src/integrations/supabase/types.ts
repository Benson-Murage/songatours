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
          balance_due: number | null
          booking_reference: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          deposit_amount: number | null
          discount_amount: number | null
          discount_code: string | null
          end_date: string | null
          guests_count: number
          id: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          phone_number: string | null
          referral_code: string | null
          special_requests: string | null
          start_date: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          tour_id: string
          user_id: string
        }
        Insert: {
          balance_due?: number | null
          booking_reference?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          deposit_amount?: number | null
          discount_amount?: number | null
          discount_code?: string | null
          end_date?: string | null
          guests_count?: number
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          phone_number?: string | null
          referral_code?: string | null
          special_requests?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          tour_id: string
          user_id: string
        }
        Update: {
          balance_due?: number | null
          booking_reference?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          deposit_amount?: number | null
          discount_amount?: number | null
          discount_code?: string | null
          end_date?: string | null
          guests_count?: number
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          phone_number?: string | null
          referral_code?: string | null
          special_requests?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          tour_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          country: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_trending: boolean
          name: string
          slug: string
        }
        Insert: {
          country: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_trending?: boolean
          name: string
          slug: string
        }
        Update: {
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_trending?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          applicable_tour_id: string | null
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          times_used: number
        }
        Insert: {
          applicable_tour_id?: string | null
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
        }
        Update: {
          applicable_tour_id?: string | null
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_applicable_tour_id_fkey"
            columns: ["applicable_tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          tour_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tour_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tour_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          booking_id: string
          created_at: string
          dietary_requirements: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string
          id: string
          nationality: string | null
          phone_number: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          dietary_requirements?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          id?: string
          nationality?: string | null
          phone_number: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          dietary_requirements?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          id?: string
          nationality?: string | null
          phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          nationality: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          nationality?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          nationality?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_booking_id: string | null
          referred_email: string | null
          referrer_id: string
          reward_amount: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_booking_id?: string | null
          referred_email?: string | null
          referrer_id: string
          reward_amount?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_booking_id?: string | null
          referred_email?: string | null
          referrer_id?: string
          reward_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_booking_id_fkey"
            columns: ["referred_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          tour_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          tour_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          tour_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          tour_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          tour_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_images_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          allow_custom_dates: boolean
          category: string
          created_at: string
          departure_date: string | null
          deposit_percentage: number | null
          description: string | null
          destination_id: string | null
          difficulty: Database["public"]["Enums"]["tour_difficulty"]
          discount_price: number | null
          duration_days: number
          excluded: string[] | null
          highlights: string[] | null
          id: string
          image_url: string | null
          included: string[] | null
          is_fixed_date: boolean
          itinerary: Json | null
          max_group_size: number
          max_total_slots: number
          price_per_person: number
          slug: string | null
          status: Database["public"]["Enums"]["tour_status"]
          title: string
          updated_at: string
          whatsapp_group_link: string | null
        }
        Insert: {
          allow_custom_dates?: boolean
          category?: string
          created_at?: string
          departure_date?: string | null
          deposit_percentage?: number | null
          description?: string | null
          destination_id?: string | null
          difficulty?: Database["public"]["Enums"]["tour_difficulty"]
          discount_price?: number | null
          duration_days?: number
          excluded?: string[] | null
          highlights?: string[] | null
          id?: string
          image_url?: string | null
          included?: string[] | null
          is_fixed_date?: boolean
          itinerary?: Json | null
          max_group_size?: number
          max_total_slots?: number
          price_per_person?: number
          slug?: string | null
          status?: Database["public"]["Enums"]["tour_status"]
          title: string
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Update: {
          allow_custom_dates?: boolean
          category?: string
          created_at?: string
          departure_date?: string | null
          deposit_percentage?: number | null
          description?: string | null
          destination_id?: string | null
          difficulty?: Database["public"]["Enums"]["tour_difficulty"]
          discount_price?: number | null
          duration_days?: number
          excluded?: string[] | null
          highlights?: string[] | null
          id?: string
          image_url?: string | null
          included?: string[] | null
          is_fixed_date?: boolean
          itinerary?: Json | null
          max_group_size?: number
          max_total_slots?: number
          price_per_person?: number
          slug?: string | null
          status?: Database["public"]["Enums"]["tour_status"]
          title?: string
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tours_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Enums: {
      app_role: "admin" | "user"
      booking_status: "pending" | "paid" | "cancelled"
      tour_difficulty: "Easy" | "Medium" | "Hard"
      tour_status: "published" | "draft" | "canceled" | "completed"
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
      booking_status: ["pending", "paid", "cancelled"],
      tour_difficulty: ["Easy", "Medium", "Hard"],
      tour_status: ["published", "draft", "canceled", "completed"],
    },
  },
} as const
