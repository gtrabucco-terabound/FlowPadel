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
      brackets: {
        Row: {
          club_id: string
          created_at: string
          event_id: string
          id: string
          size: number | null
          type: Database["public"]["Enums"]["bracket_type"]
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          event_id: string
          id?: string
          size?: number | null
          type?: Database["public"]["Enums"]["bracket_type"]
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          event_id?: string
          id?: string
          size?: number | null
          type?: Database["public"]["Enums"]["bracket_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brackets_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          club_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_leads: {
        Row: {
          converted_club_id: string | null
          created_at: string
          id: string
          mention_count: number
          name: string
          name_norm: string
          updated_at: string
        }
        Insert: {
          converted_club_id?: string | null
          created_at?: string
          id?: string
          mention_count?: number
          name: string
          name_norm: string
          updated_at?: string
        }
        Update: {
          converted_club_id?: string | null
          created_at?: string
          id?: string
          mention_count?: number
          name?: string
          name_norm?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_leads_converted_club_id_fkey"
            columns: ["converted_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["club_member_role"]
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          profile_id: string
          role?: Database["public"]["Enums"]["club_member_role"]
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["club_member_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      courts: {
        Row: {
          club_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      elo_history: {
        Row: {
          created_at: string
          delta: number
          id: string
          match_id: string | null
          player_id: string
          rating_after: number
          rating_before: number
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          match_id?: string | null
          player_id: string
          rating_after: number
          rating_before: number
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          match_id?: string | null
          player_id?: string
          rating_after?: number
          rating_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "elo_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elo_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category_id: string | null
          category_system: Database["public"]["Enums"]["category_system"] | null
          category_value: string | null
          charge_court: boolean
          club_id: string
          court_cost_month: number
          court_fee_per_person: number
          court_pool_per_person: number
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          end_date: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          inscription_per_person: number
          is_interclub: boolean
          long_format: Database["public"]["Enums"]["tournament_format"] | null
          markup_pct: number
          matches_per_court_month: number
          max_teams: number | null
          modality: Database["public"]["Enums"]["tournament_modality"] | null
          name: string
          public_visible: boolean
          registration_fee: number
          rival_accepted: boolean
          rival_club_id: string | null
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          category_system?:
            | Database["public"]["Enums"]["category_system"]
            | null
          category_value?: string | null
          charge_court?: boolean
          club_id: string
          court_cost_month?: number
          court_fee_per_person?: number
          court_pool_per_person?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_date?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          inscription_per_person?: number
          is_interclub?: boolean
          long_format?: Database["public"]["Enums"]["tournament_format"] | null
          markup_pct?: number
          matches_per_court_month?: number
          max_teams?: number | null
          modality?: Database["public"]["Enums"]["tournament_modality"] | null
          name: string
          public_visible?: boolean
          registration_fee?: number
          rival_accepted?: boolean
          rival_club_id?: string | null
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          category_system?:
            | Database["public"]["Enums"]["category_system"]
            | null
          category_value?: string | null
          charge_court?: boolean
          club_id?: string
          court_cost_month?: number
          court_fee_per_person?: number
          court_pool_per_person?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          inscription_per_person?: number
          is_interclub?: boolean
          long_format?: Database["public"]["Enums"]["tournament_format"] | null
          markup_pct?: number
          matches_per_court_month?: number
          max_teams?: number | null
          modality?: Database["public"]["Enums"]["tournament_modality"] | null
          name?: string
          public_visible?: boolean
          registration_fee?: number
          rival_accepted?: boolean
          rival_club_id?: string | null
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_rival_club_id_fkey"
            columns: ["rival_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          bracket_id: string | null
          bracket_round: number | null
          bracket_slot: number | null
          club_id: string
          court_id: string | null
          created_at: string
          event_id: string
          games_a: number | null
          games_b: number | null
          id: string
          is_rated: boolean
          next_match_id: string | null
          phase: Database["public"]["Enums"]["match_phase"]
          round_id: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          team_a_id: string | null
          team_b_id: string | null
          updated_at: string
          winner_team_id: string | null
          zone_id: string | null
        }
        Insert: {
          bracket_id?: string | null
          bracket_round?: number | null
          bracket_slot?: number | null
          club_id: string
          court_id?: string | null
          created_at?: string
          event_id: string
          games_a?: number | null
          games_b?: number | null
          id?: string
          is_rated?: boolean
          next_match_id?: string | null
          phase?: Database["public"]["Enums"]["match_phase"]
          round_id?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string
          winner_team_id?: string | null
          zone_id?: string | null
        }
        Update: {
          bracket_id?: string | null
          bracket_round?: number | null
          bracket_slot?: number | null
          club_id?: string
          court_id?: string | null
          created_at?: string
          event_id?: string
          games_a?: number | null
          games_b?: number | null
          id?: string
          is_rated?: boolean
          next_match_id?: string | null
          phase?: Database["public"]["Enums"]["match_phase"]
          round_id?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string
          winner_team_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          event_id: string | null
          id: string
          player_id: string
          read_at: string | null
          title: string
          type: string
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          player_id: string
          read_at?: string | null
          title: string
          type?: string
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          player_id?: string
          read_at?: string | null
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          club_id: string
          created_at: string
          currency: string
          event_id: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          paid_at: string | null
          payer_player_id: string | null
          pool_amount: number
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_ref: string | null
          registration_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          club_id: string
          created_at?: string
          currency?: string
          event_id: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          paid_at?: string | null
          payer_player_id?: string | null
          pool_amount?: number
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_ref?: string | null
          registration_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          club_id?: string
          created_at?: string
          currency?: string
          event_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          paid_at?: string | null
          payer_player_id?: string | null
          pool_amount?: number
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_ref?: string | null
          registration_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_player_id_fkey"
            columns: ["payer_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      player_standings: {
        Row: {
          club_id: string
          created_at: string
          event_id: string
          id: string
          lost: number
          played: number
          player_id: string
          points: number
          position: number | null
          updated_at: string
          won: number
        }
        Insert: {
          club_id: string
          created_at?: string
          event_id: string
          id?: string
          lost?: number
          played?: number
          player_id: string
          points?: number
          position?: number | null
          updated_at?: string
          won?: number
        }
        Update: {
          club_id?: string
          created_at?: string
          event_id?: string
          id?: string
          lost?: number
          played?: number
          player_id?: string
          points?: number
          position?: number | null
          updated_at?: string
          won?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_standings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_standings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_standings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birthdate: string | null
          category: number | null
          club_lead_id: string | null
          created_at: string
          elo_rating: number
          email: string | null
          first_name: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          hand: string | null
          home_club_id: string | null
          id: string
          matches_played: number
          matches_won: number
          notify_email: boolean
          notify_enabled: boolean
          notify_inapp: boolean
          notify_mixto: boolean
          notify_telegram: boolean
          notify_whatsapp: boolean
          phone: string | null
          photo_url: string | null
          profile_id: string | null
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          birthdate?: string | null
          category?: number | null
          club_lead_id?: string | null
          created_at?: string
          elo_rating?: number
          email?: string | null
          first_name?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          hand?: string | null
          home_club_id?: string | null
          id?: string
          matches_played?: number
          matches_won?: number
          notify_email?: boolean
          notify_enabled?: boolean
          notify_inapp?: boolean
          notify_mixto?: boolean
          notify_telegram?: boolean
          notify_whatsapp?: boolean
          phone?: string | null
          photo_url?: string | null
          profile_id?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          birthdate?: string | null
          category?: number | null
          club_lead_id?: string | null
          created_at?: string
          elo_rating?: number
          email?: string | null
          first_name?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          hand?: string | null
          home_club_id?: string | null
          id?: string
          matches_played?: number
          matches_won?: number
          notify_email?: boolean
          notify_enabled?: boolean
          notify_inapp?: boolean
          notify_mixto?: boolean
          notify_telegram?: boolean
          notify_whatsapp?: boolean
          phone?: string | null
          photo_url?: string | null
          profile_id?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_club_lead_id_fkey"
            columns: ["club_lead_id"]
            isOneToOne: false
            referencedRelation: "club_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_home_club_id_fkey"
            columns: ["home_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          global_role: Database["public"]["Enums"]["app_role"]
          id: string
          player_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["app_role"]
          id: string
          player_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["app_role"]
          id?: string
          player_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          club_id: string
          created_at: string
          event_id: string
          id: string
          modality: Database["public"]["Enums"]["tournament_modality"] | null
          partner_claim_code: string | null
          player_1_category: number | null
          player_1_gender: Database["public"]["Enums"]["gender"] | null
          player_1_id: string | null
          player_1_name: string
          player_1_phone: string | null
          player_2_category: number | null
          player_2_gender: Database["public"]["Enums"]["gender"] | null
          player_2_id: string | null
          player_2_name: string | null
          player_2_phone: string | null
          status: Database["public"]["Enums"]["registration_status"]
          team_id: string | null
          updated_at: string
          waitlist_position: number | null
        }
        Insert: {
          club_id: string
          created_at?: string
          event_id: string
          id?: string
          modality?: Database["public"]["Enums"]["tournament_modality"] | null
          partner_claim_code?: string | null
          player_1_category?: number | null
          player_1_gender?: Database["public"]["Enums"]["gender"] | null
          player_1_id?: string | null
          player_1_name: string
          player_1_phone?: string | null
          player_2_category?: number | null
          player_2_gender?: Database["public"]["Enums"]["gender"] | null
          player_2_id?: string | null
          player_2_name?: string | null
          player_2_phone?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          team_id?: string | null
          updated_at?: string
          waitlist_position?: number | null
        }
        Update: {
          club_id?: string
          created_at?: string
          event_id?: string
          id?: string
          modality?: Database["public"]["Enums"]["tournament_modality"] | null
          partner_claim_code?: string | null
          player_1_category?: number | null
          player_1_gender?: Database["public"]["Enums"]["gender"] | null
          player_1_id?: string | null
          player_1_name?: string
          player_1_phone?: string | null
          player_2_category?: number | null
          player_2_gender?: Database["public"]["Enums"]["gender"] | null
          player_2_id?: string | null
          player_2_name?: string | null
          player_2_phone?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          team_id?: string | null
          updated_at?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_player_1_id_fkey"
            columns: ["player_1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_player_2_id_fkey"
            columns: ["player_2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          club_id: string
          created_at: string
          event_id: string
          id: string
          number: number
          scheduled_date: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          event_id: string
          id?: string
          number: number
          scheduled_date?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          event_id?: string
          id?: string
          number?: number
          scheduled_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      standings: {
        Row: {
          club_id: string
          created_at: string
          games_against: number
          games_diff: number
          games_for: number
          id: string
          lost: number
          played: number
          points: number
          position: number | null
          team_id: string
          updated_at: string
          won: number
          zone_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          games_against?: number
          games_diff?: number
          games_for?: number
          id?: string
          lost?: number
          played?: number
          points?: number
          position?: number | null
          team_id: string
          updated_at?: string
          won?: number
          zone_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          games_against?: number
          games_diff?: number
          games_for?: number
          id?: string
          lost?: number
          played?: number
          points?: number
          position?: number | null
          team_id?: string
          updated_at?: string
          won?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category_value: string | null
          club_id: string
          created_at: string
          ephemeral: boolean
          event_id: string
          id: string
          modality: Database["public"]["Enums"]["tournament_modality"] | null
          name: string | null
          player_1_id: string | null
          player_2_id: string | null
          seed: number | null
          updated_at: string
        }
        Insert: {
          category_value?: string | null
          club_id: string
          created_at?: string
          ephemeral?: boolean
          event_id: string
          id?: string
          modality?: Database["public"]["Enums"]["tournament_modality"] | null
          name?: string | null
          player_1_id?: string | null
          player_2_id?: string | null
          seed?: number | null
          updated_at?: string
        }
        Update: {
          category_value?: string | null
          club_id?: string
          created_at?: string
          ephemeral?: boolean
          event_id?: string
          id?: string
          modality?: Database["public"]["Enums"]["tournament_modality"] | null
          name?: string | null
          player_1_id?: string | null
          player_2_id?: string | null
          seed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_player_1_id_fkey"
            columns: ["player_1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_player_2_id_fkey"
            columns: ["player_2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_invites: {
        Row: {
          channel: string
          created_at: string
          event_id: string
          id: string
          player_id: string
          reason: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          channel?: string
          created_at?: string
          event_id: string
          id?: string
          player_id: string
          reason?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          event_id?: string
          id?: string
          player_id?: string
          reason?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_invites_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_teams: {
        Row: {
          team_id: string
          zone_id: string
        }
        Insert: {
          team_id: string
          zone_id: string
        }
        Update: {
          team_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_teams_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          category_value: string | null
          club_id: string
          created_at: string
          event_id: string
          id: string
          modality: Database["public"]["Enums"]["tournament_modality"] | null
          name: string
          updated_at: string
        }
        Insert: {
          category_value?: string | null
          club_id: string
          created_at?: string
          event_id: string
          id?: string
          modality?: Database["public"]["Enums"]["tournament_modality"] | null
          name: string
          updated_at?: string
        }
        Update: {
          category_value?: string | null
          club_id?: string
          created_at?: string
          event_id?: string
          id?: string
          modality?: Database["public"]["Enums"]["tournament_modality"] | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _assert_event_access: { Args: { p_event_id: string }; Returns: string }
      _resolve_first_round_byes: {
        Args: { p_bracket_id: string }
        Returns: undefined
      }
      accept_interclub: { Args: { p_event_id: string }; Returns: undefined }
      add_club_member: {
        Args: {
          p_club_id: string
          p_email: string
          p_role: Database["public"]["Enums"]["club_member_role"]
        }
        Returns: string
      }
      apply_elo_for_match: { Args: { p_match_id: string }; Returns: undefined }
      claim_partner_spot: {
        Args: {
          p_category: number
          p_code: string
          p_full_name: string
          p_gender: Database["public"]["Enums"]["gender"]
        }
        Returns: undefined
      }
      club_ranking: {
        Args: never
        Returns: {
          club_id: string
          club_name: string
          players_count: number
          total_points: number
          tournaments_count: number
        }[]
      }
      event_open_for_registration: {
        Args: { p_club_id: string; p_event_id: string }
        Returns: boolean
      }
      generate_americano: {
        Args: {
          p_courts?: number
          p_event_id: string
          p_first_hour?: number
          p_rounds?: number
          p_slot_minutes?: number
          p_start_date?: string
        }
        Returns: number
      }
      generate_bracket: {
        Args: { p_event_id: string; p_qualifiers_per_zone?: number }
        Returns: string
      }
      generate_division_zones: {
        Args: { p_event_id: string; p_teams_per_zone?: number }
        Returns: number
      }
      generate_event_invites: { Args: { p_event_id: string }; Returns: number }
      generate_group_matches: { Args: { p_event_id: string }; Returns: number }
      generate_league: {
        Args: {
          p_courts?: number
          p_event_id: string
          p_first_hour?: number
          p_slot_minutes?: number
          p_slots_per_court?: number
          p_start_date?: string
        }
        Returns: number
      }
      get_registration_claim: {
        Args: { p_code: string }
        Returns: {
          already_claimed: boolean
          club_id: string
          event_name: string
          event_slug: string
          inviter_name: string
          partner_name: string
        }[]
      }
      is_club_admin: { Args: { club: string }; Returns: boolean }
      is_club_member: { Args: { club: string }; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      list_club_members: {
        Args: { p_club_id: string }
        Returns: {
          email: string
          full_name: string
          profile_id: string
          role: Database["public"]["Enums"]["club_member_role"]
        }[]
      }
      recompute_player_standings: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      recompute_standings: { Args: { p_event_id: string }; Returns: undefined }
      submit_match_result: {
        Args: { p_games_a: number; p_games_b: number; p_match_id: string }
        Returns: undefined
      }
      upsert_club_lead: { Args: { p_name: string }; Returns: string }
    }
    Enums: {
      app_role: "superadmin" | "club_admin" | "staff" | "player"
      bracket_type: "single_elimination"
      category_system: "fixed" | "suma"
      club_member_role: "club_admin" | "staff"
      event_status: "draft" | "open" | "in_progress" | "closed" | "cancelled"
      event_type: "tournament" | "open_play"
      gender: "male" | "female"
      match_phase:
        | "open_play"
        | "group_stage"
        | "round_of_16"
        | "quarter_final"
        | "semi_final"
        | "third_place"
        | "final"
      match_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "walkover"
        | "cancelled"
      payment_kind: "inscription" | "court_fee"
      payment_provider: "cash" | "mercadopago" | "stripe" | "transfer" | "other"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
      registration_status:
        | "pending"
        | "approved"
        | "rejected"
        | "waitlist"
        | "cancelled"
      tournament_format:
        | "liga_ida"
        | "liga_ida_vuelta"
        | "liga_playoff"
        | "americano"
      tournament_modality: "caballeros" | "damas" | "mixto" | "combinado"
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
      app_role: ["superadmin", "club_admin", "staff", "player"],
      bracket_type: ["single_elimination"],
      category_system: ["fixed", "suma"],
      club_member_role: ["club_admin", "staff"],
      event_status: ["draft", "open", "in_progress", "closed", "cancelled"],
      event_type: ["tournament", "open_play"],
      gender: ["male", "female"],
      match_phase: [
        "open_play",
        "group_stage",
        "round_of_16",
        "quarter_final",
        "semi_final",
        "third_place",
        "final",
      ],
      match_status: [
        "scheduled",
        "in_progress",
        "completed",
        "walkover",
        "cancelled",
      ],
      payment_kind: ["inscription", "court_fee"],
      payment_provider: ["cash", "mercadopago", "stripe", "transfer", "other"],
      payment_status: ["pending", "paid", "failed", "refunded", "cancelled"],
      registration_status: [
        "pending",
        "approved",
        "rejected",
        "waitlist",
        "cancelled",
      ],
      tournament_format: [
        "liga_ida",
        "liga_ida_vuelta",
        "liga_playoff",
        "americano",
      ],
      tournament_modality: ["caballeros", "damas", "mixto", "combinado"],
    },
  },
} as const
