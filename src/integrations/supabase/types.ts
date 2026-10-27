export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          deadline_time: string;
          deadline_weekday: number;
          id: number;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          deadline_time?: string;
          deadline_weekday?: number;
          id?: number;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          deadline_time?: string;
          deadline_weekday?: number;
          id?: number;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meal_selections: {
        Row: {
          created_at: string;
          delivery_date: string;
          id: string;
          meal_id: string;
          menu_id: string;
          subscription_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          delivery_date: string;
          id?: string;
          meal_id: string;
          menu_id: string;
          subscription_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          delivery_date?: string;
          id?: string;
          meal_id?: string;
          menu_id?: string;
          subscription_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_selections_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_selections_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "weekly_menus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_selections_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_selections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meals: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          updated_at: string;
          calories: number | null;
        };
        Insert: {
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          updated_at?: string;
          calories?: number | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
          calories?: number | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number | null;
          created_at: string;
          currency: string;
          id: string;
          method: string;
          notes: string | null;
          received_at: string;
          recorded_by: string | null;
          reference: string | null;
          subscription_id: string;
          user_id: string;
        };
        Insert: {
          amount?: number | null;
          created_at?: string;
          currency?: string;
          id?: string;
          method?: string;
          notes?: string | null;
          received_at?: string;
          recorded_by?: string | null;
          reference?: string | null;
          subscription_id: string;
          user_id: string;
        };
        Update: {
          amount?: number | null;
          created_at?: string;
          currency?: string;
          id?: string;
          method?: string;
          notes?: string | null;
          received_at?: string;
          recorded_by?: string | null;
          reference?: string | null;
          subscription_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          delivery_address: string;
          email: string;
          full_name: string;
          id: string;
          phone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          delivery_address?: string;
          email?: string;
          full_name?: string;
          id: string;
          phone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          delivery_address?: string;
          email?: string;
          full_name?: string;
          id?: string;
          phone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          activated_at: string | null;
          admin_notes: string | null;
          billing_period: Database["public"]["Enums"]["billing_period"];
          cancelled_at: string | null;
          created_at: string;
          days_per_week: number;
          default_days: number[];
          end_date: string | null;
          id: string;
          payment_received_at: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          activated_at?: string | null;
          admin_notes?: string | null;
          billing_period: Database["public"]["Enums"]["billing_period"];
          cancelled_at?: string | null;
          created_at?: string;
          days_per_week: number;
          default_days: number[];
          end_date?: string | null;
          id?: string;
          payment_received_at?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          activated_at?: string | null;
          admin_notes?: string | null;
          billing_period?: Database["public"]["Enums"]["billing_period"];
          cancelled_at?: string | null;
          created_at?: string;
          days_per_week?: number;
          default_days?: number[];
          end_date?: string | null;
          id?: string;
          payment_received_at?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      week_confirmations: {
        Row: {
          confirmed_at: string;
          menu_id: string;
          subscription_id: string;
          user_id: string;
        };
        Insert: {
          confirmed_at?: string;
          menu_id: string;
          subscription_id: string;
          user_id: string;
        };
        Update: {
          confirmed_at?: string;
          menu_id?: string;
          subscription_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "week_confirmations_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "weekly_menus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "week_confirmations_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "week_confirmations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_menu_items: {
        Row: {
          meal_id: string;
          menu_id: string;
        };
        Insert: {
          meal_id: string;
          menu_id: string;
        };
        Update: {
          meal_id?: string;
          menu_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_menu_items_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_menu_items_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "weekly_menus";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_menus: {
        Row: {
          created_at: string;
          id: string;
          is_published: boolean;
          notes: string | null;
          updated_at: string;
          week_start: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_published?: boolean;
          notes?: string | null;
          updated_at?: string;
          week_start: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_published?: boolean;
          notes?: string | null;
          updated_at?: string;
          week_start?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      confirm_week: {
        Args: { _menu_id: string; _subscription_id: string };
        Returns: string;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
      required_dates: {
        Args: { _subscription_id: string; _week_start: string };
        Returns: string[];
      };
      selection_deadline: { Args: { _week_start: string }; Returns: string };
      valid_subscription_days: { Args: { _days: number[] }; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "customer";
      billing_period: "weekly" | "monthly";
      subscription_status: "pending_payment" | "active" | "paused" | "expired" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      billing_period: ["weekly", "monthly"],
      subscription_status: ["pending_payment", "active", "paused", "expired", "cancelled"],
    },
  },
} as const;
