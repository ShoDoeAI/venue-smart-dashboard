/**
 * Database types placeholder
 * 
 * This file will be replaced with auto-generated types from Supabase
 * Run 'pnpm generate:types' after setting up your Supabase project
 */

import type { Json } from './json';

export interface Database {
  public: {
    Tables: {
      venue_config: {
        Row: {
          id: string;
          name: string;
          timezone: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['venue_config']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['venue_config']['Insert']>;
      };
      // Add other tables here after generation
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Placeholder types for development
export type VenueConfig = Database['public']['Tables']['venue_config']['Row'];