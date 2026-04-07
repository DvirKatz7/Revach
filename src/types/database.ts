export type UnitType = 'kg' | 'g' | 'l' | 'ml' | 'unit'
export type KosherType = 'meat' | 'dairy' | 'pareve'

export interface Restaurant {
  id: string
  owner_id: string
  name: string
  kosher_enabled: boolean
  vat_rate: number
  default_margin_target: number
  currency: string
  created_at: string
  updated_at: string
}

export interface Ingredient {
  id: string
  restaurant_id: string
  name_he: string
  unit: UnitType
  cost_per_unit: number
  kosher_type: KosherType
  supplier: string | null
  updated_at: string
}

export interface Recipe {
  id: string
  restaurant_id: string
  name_he: string
  category: string | null
  selling_price: number | null
  portions: number
  target_margin_pct: number
  is_active: boolean
  created_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  ingredient_id: string
  quantity: number
  yield_pct: number
}

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          owner_id: string
          name: string
          kosher_enabled: boolean
          vat_rate: number
          default_margin_target: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          kosher_enabled?: boolean
          vat_rate?: number
          default_margin_target?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          kosher_enabled?: boolean
          vat_rate?: number
          default_margin_target?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          id: string
          restaurant_id: string
          name_he: string
          unit: UnitType
          cost_per_unit: number
          kosher_type: KosherType
          supplier: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name_he: string
          unit: UnitType
          cost_per_unit: number
          kosher_type: KosherType
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name_he?: string
          unit?: UnitType
          cost_per_unit?: number
          kosher_type?: KosherType
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      recipes: {
        Row: {
          id: string
          restaurant_id: string
          name_he: string
          category: string | null
          selling_price: number | null
          portions: number
          target_margin_pct: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name_he: string
          category?: string | null
          selling_price?: number | null
          portions?: number
          target_margin_pct?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name_he?: string
          category?: string | null
          selling_price?: number | null
          portions?: number
          target_margin_pct?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          ingredient_id: string
          quantity: number
          yield_pct: number
        }
        Insert: {
          id?: string
          recipe_id: string
          ingredient_id: string
          quantity: number
          yield_pct?: number
        }
        Update: {
          id?: string
          recipe_id?: string
          ingredient_id?: string
          quantity?: number
          yield_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      unit_type: UnitType
      kosher_type: KosherType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
