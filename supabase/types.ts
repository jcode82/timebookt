export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          region_code: string;
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
          region_code?: string;
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
          region_code: string;
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
          region_code?: string;
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
          region_code: string;
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
          region_code?: string;
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
          region_code: string;
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
          region_code?: string;
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
          region_code: string;
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
          region_code?: string;
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
          region_code: string;
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
          region_code?: string;
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
          region_code: string;
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
          region_code?: string;
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
          region_code: string;
          actor_type: string;
          actor_id: string | null;
          action: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          region_code?: string;
          actor_type: string;
          actor_id?: string | null;
          action: string;
          payload?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["waitlist"]["Insert"]>;
      };
      appointment_reminder_events: {
        Row: {
          id: string;
          appointment_id: string;
          reminder_type: string;
          scheduled_for: string;
          created_at: string;
          meta: Json;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          reminder_type: string;
          scheduled_for: string;
          created_at?: string;
          meta?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["appointment_reminder_events"]["Insert"]>;
      };
      appointment_lifecycle_events: {
        Row: {
          id: string;
          appointment_id: string;
          event_type: string;
          from_start_time: string;
          from_end_time: string;
          to_start_time: string;
          to_end_time: string;
          reason: string | null;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          event_type: string;
          from_start_time: string;
          from_end_time: string;
          to_start_time: string;
          to_end_time: string;
          reason?: string | null;
          source?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointment_lifecycle_events"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      cancel_appointment: {
        Args: {
          appointment_id: string;
          region_code: string;
          cancellation_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      create_appointment: {
        Args: {
          business_id: string;
          customer_id: string;
          service_id: string;
          region_code: string;
          start_time: string;
          end_time: string;
          staff_id?: string | null;
          notes?: string | null;
        };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      create_business: {
        Args: {
          slug: string;
          name: string;
          region_code: string;
          timezone: string;
          contact_email: string;
          description?: string | null;
          contact_phone?: string | null;
          settings?: Json;
        };
        Returns: Database["public"]["Tables"]["businesses"]["Row"];
      };
      create_customer: {
        Args: {
          business_id: string;
          region_code: string;
          full_name: string;
          email: string;
          phone?: string | null;
          locale?: string | null;
        };
        Returns: Database["public"]["Tables"]["customers"]["Row"];
      };
      create_template: {
        Args: {
          business_id: string;
          region_code: string;
          slug: string;
          channel: string;
          name: string;
          body: string;
          locale: string;
          subject?: string | null;
        };
        Returns: Database["public"]["Tables"]["templates"]["Row"];
      };
      update_template: {
        Args: {
          template_id: string;
          business_id: string;
          region_code: string;
          patch?: Json;
        };
        Returns: Database["public"]["Tables"]["templates"]["Row"];
      };
      create_waitlist_entry: {
        Args: {
          email: string;
        };
        Returns: Database["public"]["Tables"]["waitlist"]["Row"];
      };
      create_appointment_reminder_event: {
        Args: {
          appointment_id: string;
          reminder_type: string;
          scheduled_for: string;
          meta?: Json;
        };
        Returns: Database["public"]["Tables"]["appointment_reminder_events"]["Row"];
      };
      reschedule_appointment: {
        Args: {
          appointment_id: string;
          region_code: string;
          new_start_time: string;
          new_end_time: string;
          reason?: string | null;
          source?: string | null;
        };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
    };
    Enums: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
