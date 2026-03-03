export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'owner' | 'ops' | 'finance'
export type JobStatus = 'quoted' | 'won' | 'scheduled' | 'in_progress' | 'complete' | 'lost'
export type JWTier = 'red' | 'black' | 'blue'
export type InstallType = 'fullSubframe' | 'overConcrete' | 'redeck'
export type CrewType = 'full_time' | 'casual' | 'subby' | 'experiment'
export type PayCycle = 'weekly' | 'fortnightly' | 'invoice'
export type CashflowType = 'inflow' | 'outflow'
export type CashflowCategory =
  | 'deposit'
  | 'materials_claim'
  | 'subframe_claim'
  | 'completion_claim'
  | 'payroll'
  | 'materials'
  | 'opex'
  | 'tax'
  | 'adhoc'

export interface Database {
  public: {
    Views: Record<string, never>
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: UserRole
          full_name?: string | null
        }
        Update: {
          role?: UserRole
          full_name?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          category: 'timber' | 'composite'
          cost_per_m2: number
          rate_full_subframe: number
          rate_over_concrete: number
          rate_redeck: number
          durability_score: number
          description: string | null
          active: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          category: 'timber' | 'composite'
          cost_per_m2: number
          rate_full_subframe: number
          rate_over_concrete: number
          rate_redeck: number
          durability_score: number
          description?: string | null
          active?: boolean
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
        Relationships: []
      }
      crew: {
        Row: {
          id: string
          name: string
          type: CrewType
          base_rate: number | null
          loaded_rate: number | null
          payg_rate: number | null
          pay_cycle: PayCycle
          active: boolean
          sentiment_score: number | null
          last_checkin_date: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          type: CrewType
          base_rate?: number | null
          loaded_rate?: number | null
          payg_rate?: number | null
          pay_cycle: PayCycle
          active?: boolean
          sentiment_score?: number | null
          last_checkin_date?: string | null
        }
        Update: Partial<Database['public']['Tables']['crew']['Insert']>
        Relationships: []
      }
      jobs: {
        Row: {
          id: string
          name: string
          client_name: string
          client_id_ghl: string | null
          buildxact_estimate_id: string | null
          status: JobStatus
          jw_tier: JWTier
          sqm: number | null
          install_type: InstallType | null
          use_h4: boolean
          product_id: string | null
          quoted_total_value: number | null
          quoted_labour_value: number | null
          quoted_gp_amount: number | null
          quoted_gp_pct: number | null
          quoted_labour_hours: number | null
          quoted_days: number | null
          actual_labour_value: number | null
          actual_gp_amount: number | null
          actual_gp_pct: number | null
          actual_labour_hours: number | null
          actual_days: number | null
          start_date: string | null
          materials_order_date: string | null
          materials_delivery_date: string | null
          subframe_complete_date: string | null
          completion_date: string | null
          deposit_paid_date: string | null
          materials_claim_paid_date: string | null
          subframe_claim_paid_date: string | null
          completion_paid_date: string | null
          quote_sent_date: string | null
          won_date: string | null
          lost_date: string | null
          lost_reason: string | null
          complexity_stairs: number
          complexity_handrail_lm: number
          complexity_curve_hrs: number
          complexity_other_hrs: number
          subframe_rate: number | null
          subframe_h4: boolean
          address: string | null
          suburb: string | null
          notes: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          client_name: string
          client_id_ghl?: string | null
          buildxact_estimate_id?: string | null
          status?: JobStatus
          jw_tier?: JWTier
          sqm?: number | null
          install_type?: InstallType | null
          use_h4?: boolean
          product_id?: string | null
          quoted_total_value?: number | null
          quoted_labour_value?: number | null
          quoted_gp_amount?: number | null
          quoted_gp_pct?: number | null
          quoted_labour_hours?: number | null
          quoted_days?: number | null
          quote_sent_date?: string | null
          address?: string | null
          suburb?: string | null
          notes?: string | null
          complexity_stairs?: number
          complexity_handrail_lm?: number
          complexity_curve_hrs?: number
          complexity_other_hrs?: number
        }
        Update: Partial<Database['public']['Tables']['jobs']['Insert']> & {
          status?: JobStatus
          start_date?: string | null
          materials_order_date?: string | null
          materials_delivery_date?: string | null
          subframe_complete_date?: string | null
          completion_date?: string | null
          deposit_paid_date?: string | null
          materials_claim_paid_date?: string | null
          subframe_claim_paid_date?: string | null
          completion_paid_date?: string | null
          won_date?: string | null
          lost_date?: string | null
          lost_reason?: string | null
          actual_labour_value?: number | null
          actual_gp_amount?: number | null
          actual_gp_pct?: number | null
          actual_labour_hours?: number | null
          actual_days?: number | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      timesheets: {
        Row: {
          id: string
          job_id: string
          crew_id: string
          date: string
          day_index: number
          hours: number
          notes: string | null
          created_at: string
        }
        Insert: {
          job_id: string
          crew_id: string
          date: string
          day_index: number
          hours: number
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['timesheets']['Insert']>
        Relationships: [
          {
            foreignKeyName: "timesheets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crew"
            referencedColumns: ["id"]
          }
        ]
      }
      material_actuals: {
        Row: {
          id: string
          job_id: string
          supplier: string
          description: string
          allowed_amount: number
          actual_amount: number | null
          variance: number | null
          purchase_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          job_id: string
          supplier: string
          description: string
          allowed_amount: number
          actual_amount?: number | null
          purchase_date?: string | null
        }
        Update: Partial<Database['public']['Tables']['material_actuals']['Insert']>
        Relationships: [
          {
            foreignKeyName: "material_actuals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      cashflow_events: {
        Row: {
          id: string
          job_id: string | null
          type: CashflowType
          category: CashflowCategory
          label: string
          amount: number
          scheduled_date: string
          paid_date: string | null
          auto_generated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          job_id?: string | null
          type: CashflowType
          category: CashflowCategory
          label: string
          amount: number
          scheduled_date: string
          paid_date?: string | null
          auto_generated?: boolean
        }
        Update: Partial<Database['public']['Tables']['cashflow_events']['Insert']>
        Relationships: [
          {
            foreignKeyName: "cashflow_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          value?: Json
        }
        Relationships: []
      }
      agent_memory: {
        Row: {
          id: string
          type: 'preference' | 'decision' | 'instruction' | 'context'
          content: string
          context: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          type: 'preference' | 'decision' | 'instruction' | 'context'
          content: string
          context?: string | null
          active?: boolean
        }
        Update: Partial<Database['public']['Tables']['agent_memory']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          type: string
          title: string
          body: string
          role: 'owner' | 'ops' | 'finance' | 'all'
          job_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          type: string
          title: string
          body: string
          role: 'owner' | 'ops' | 'finance' | 'all'
          job_id?: string | null
          read?: boolean
        }
        Update: { read?: boolean }
        Relationships: []
      }
      conversation_history: {
        Row: {
          id: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          user_id: string
          role: 'user' | 'assistant'
          content: string
          metadata?: Json | null
        }
        Update: { metadata?: Json | null }
        Relationships: []
      }
      quote_line_items: {
        Row: {
          id: string
          job_id: string
          item_type: string
          description: string
          quantity: number | null
          unit: string | null
          unit_rate: number | null
          amount: number
          created_at: string
        }
        Insert: {
          job_id: string
          item_type: string
          description: string
          quantity?: number | null
          unit?: string | null
          unit_rate?: number | null
          amount: number
        }
        Update: { amount?: number }
        Relationships: [
          {
            foreignKeyName: "quote_line_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      ad_performance: {
        Row: {
          id: string
          date: string
          platform: 'google' | 'meta'
          campaign: string | null
          spend: number
          impressions: number | null
          clicks: number | null
          leads_generated: number | null
          ctr: number | null
          cpc: number | null
          created_at: string
        }
        Insert: {
          date: string
          platform: 'google' | 'meta'
          campaign?: string | null
          spend: number
          impressions?: number | null
          clicks?: number | null
          leads_generated?: number | null
        }
        Update: Partial<Database['public']['Tables']['ad_performance']['Insert']>
        Relationships: []
      }
    }
    Functions: {
      auth_role: {
        Args: Record<string, never>
        Returns: string
      }
      create_progress_claim_events: {
        Args: { p_job_id: string }
        Returns: void
      }
      complete_job_snapshot: {
        Args: { p_job_id: string }
        Returns: void
      }
      get_cashflow_position: {
        Args: Record<string, never>
        Returns: Json
      }
      get_pipeline_summary: {
        Args: Record<string, never>
        Returns: Json
      }
    }
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Crew = Database['public']['Tables']['crew']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type Timesheet = Database['public']['Tables']['timesheets']['Row']
export type MaterialActual = Database['public']['Tables']['material_actuals']['Row']
export type CashflowEvent = Database['public']['Tables']['cashflow_events']['Row']
export type Setting = Database['public']['Tables']['settings']['Row']
export type AgentMemory = Database['public']['Tables']['agent_memory']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type ConversationMessage = Database['public']['Tables']['conversation_history']['Row']
export type QuoteLineItem = Database['public']['Tables']['quote_line_items']['Row']
export type AdPerformance = Database['public']['Tables']['ad_performance']['Row']
