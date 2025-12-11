export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          region_code: string | null;
          timezone: string;
          contact_email: string;
          contact_phone: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          region_code?: string | null;
          timezone?: string;
          contact_email: string;
          contact_phone?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
      };
      staff: {
        Row: {
          id: string;
          business_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff"]["Insert"]>;
      };
      services: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          duration_minutes: number;
          price_cents: number;
          currency: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          duration_minutes: number;
          price_cents?: number;
          currency?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          full_name: string;
          email: string;
          phone: string | null;
          locale: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          locale?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      availability_blocks: {
        Row: {
          id: string;
          business_id: string;
          staff_id: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          capacity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          staff_id?: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          capacity?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["availability_blocks"]["Insert"]>;
      };
      appointments: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          service_id: string;
          staff_id: string | null;
          start_time: string;
          end_time: string;
          status: string;
          cancellation_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          service_id: string;
          staff_id?: string | null;
          start_time: string;
          end_time: string;
          status?: string;
          cancellation_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
      };
      templates: {
        Row: {
          id: string;
          business_id: string;
          slug: string;
          channel: string;
          name: string;
          subject: string | null;
          body: string;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          slug: string;
          channel: string;
          name: string;
          subject?: string | null;
          body: string;
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["templates"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          business_id: string;
          actor_type: string;
          actor_id: string | null;
          action: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          actor_type: string;
          actor_id?: string | null;
          action: string;
          payload?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
      };
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
