export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          image: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          image?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          image?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          image: string | null
          category_id: string | null
          plate: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          image?: string | null
          category_id?: string | null
          plate?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          image?: string | null
          category_id?: string | null
          plate?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      knasta_prices: {
        Row: {
          id: number
          product_id: string
          price: number
          url: string | null
          last_updated: string
        }
        Insert: {
          id?: number
          product_id: string
          price: number
          url?: string | null
          last_updated?: string
        }
        Update: {
          id?: number
          product_id?: string
          price?: number
          url?: string | null
          last_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "knasta_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_specs: {
        Row: {
          id: number
          product_id: string
          name: string
          value: string
        }
        Insert: {
          id?: number
          product_id: string
          name: string
          value: string
        }
        Update: {
          id?: number
          product_id?: string
          name?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'user' | 'admin'
          total_points: number
          total_recycled: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'user' | 'admin'
          total_points?: number
          total_recycled?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'user' | 'admin'
          total_points?: number
          total_recycled?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          points: number
          qr_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          points?: number
          qr_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          points?: number
          qr_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recycling_events: {
        Row: {
          id: string
          user_id: string | null
          plate: string | null
          material_type: string
          weight_kg: number | null
          points_earned: number
          photo_url: string | null
          status: string
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          plate?: string | null
          material_type: string
          weight_kg?: number | null
          points_earned?: number
          photo_url?: string | null
          status?: string
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          plate?: string | null
          material_type?: string
          weight_kg?: number | null
          points_earned?: number
          photo_url?: string | null
          status?: string
          source?: string
          created_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          id: string
          user_id: string | null
          code: string
          type: string
          value: number
          min_purchase: number
          status: 'active' | 'used' | 'expired'
          expires_at: string | null
          created_at: string
          used_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          code: string
          type: string
          value: number
          min_purchase?: number
          status?: 'active' | 'used' | 'expired'
          expires_at?: string | null
          created_at?: string
          used_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          code?: string
          type?: string
          value?: number
          min_purchase?: number
          status?: 'active' | 'used' | 'expired'
          expires_at?: string | null
          created_at?: string
          used_at?: string | null
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
  }
}
