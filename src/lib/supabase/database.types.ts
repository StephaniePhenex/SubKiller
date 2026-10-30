// Database types for the Supabase clients, in the shape `supabase gen types` emits.
// Regenerate after a migration (needs the local stack running):
//   npx supabase gen types typescript --local > src/lib/supabase/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          ai_score: number | null;
          cost: number;
          created_at: string;
          feeling: string;
          frequency: string;
          id: string;
          name: string;
          user_id: string;
          verdict: string | null;
        };
        Insert: {
          ai_score?: number | null;
          cost: number;
          created_at?: string;
          feeling?: string;
          frequency: string;
          id?: string;
          name: string;
          user_id?: string;
          verdict?: string | null;
        };
        Update: {
          ai_score?: number | null;
          cost?: number;
          created_at?: string;
          feeling?: string;
          frequency?: string;
          id?: string;
          name?: string;
          user_id?: string;
          verdict?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
