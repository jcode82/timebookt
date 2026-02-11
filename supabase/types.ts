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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      appointment_reminder_events: {
        Row: {
          id: string;
          appointment_id: string;
          reminder_type: string;
          channel: string;
          scheduled_for: string;
          created_at: string;
          status: string;
          attempt_count: number;
          last_attempt_at: string | null;
          next_attempt_at: string | null;
          sent_at: string | null;
          provider_message_id: string | null;
          last_error: Json;
          updated_at: string;
          meta: Json;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          reminder_type: string;
          channel?: string;
          scheduled_for: string;
          created_at?: string;
          status?: string;
          attempt_count?: number;
          last_attempt_at?: string | null;
          next_attempt_at?: string | null;
          sent_at?: string | null;
          provider_message_id?: string | null;
          last_error?: Json;
          updated_at?: string;
          meta?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["appointment_reminder_events"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
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
          channel: string;
          scheduled_for: string;
          meta?: Json;
        };
        Returns: Database["public"]["Tables"]["appointment_reminder_events"]["Row"];
      };
      claim_appointment_reminder_event: {
        Args: {
          reminder_event_id: string;
          lock_timeout_seconds?: number;
          now_ts?: string;
          max_attempts?: number;
        };
        Returns: Database["public"]["Tables"]["appointment_reminder_events"]["Row"];
      };
      reschedule_appointment: {
        Args: {
          p_appointment_id: string;
          p_region_code: string;
          p_new_start_time: string;
          p_new_end_time: string;
          p_reason?: string | null;
          p_source?: string | null;
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
