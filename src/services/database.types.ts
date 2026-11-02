
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "dishes": {
                  Row: {
                    "add_ons": (string)[],"aliases_my": (string)[],"aliases_roman": (string)[],"aliases_zawgyi": (string)[],"carb_g": number,"created_at": string,"deleted_at": string | null,"fat_g": number,"has_sweetness": boolean,"id": string,"is_vegetarian": boolean,"kcal": number,"name_en": string,"name_my": string,"oil_sensitive": boolean,"photo_path": string | null,"protein_g": number,"serving_g": number | null,"sodium_mg": number | null,"source": string | null,"sugar_g": number | null,"unit": string,"updated_at": string,"verified_at": string | null,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "add_ons"?: (string)[],"aliases_my"?: (string)[],"aliases_roman"?: (string)[],"aliases_zawgyi"?: (string)[],"carb_g": number,"created_at"?: string,"deleted_at"?: string | null,"fat_g": number,"has_sweetness"?: boolean,"id": string,"is_vegetarian"?: boolean,"kcal": number,"name_en": string,"name_my": string,"oil_sensitive"?: boolean,"photo_path"?: string | null,"protein_g": number,"serving_g"?: number | null,"sodium_mg"?: number | null,"source"?: string | null,"sugar_g"?: number | null,"unit": string,"updated_at"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "add_ons"?: (string)[],"aliases_my"?: (string)[],"aliases_roman"?: (string)[],"aliases_zawgyi"?: (string)[],"carb_g"?: number,"created_at"?: string,"deleted_at"?: string | null,"fat_g"?: number,"has_sweetness"?: boolean,"id"?: string,"is_vegetarian"?: boolean,"kcal"?: number,"name_en"?: string,"name_my"?: string,"oil_sensitive"?: boolean,"photo_path"?: string | null,"protein_g"?: number,"serving_g"?: number | null,"sodium_mg"?: number | null,"source"?: string | null,"sugar_g"?: number | null,"unit"?: string,"updated_at"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"food_logs": {
                  Row: {
                    "candidates": Json | null,"confidence": number | null,"created_at": string,"deleted_at": string | null,"eaten_at": string,"id": string,"is_shared_meal": boolean,"photo_path": string | null,"source": string,"status": string,"synced_at": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidates"?: Json | null,"confidence"?: number | null,"created_at"?: string,"deleted_at"?: string | null,"eaten_at": string,"id": string,"is_shared_meal"?: boolean,"photo_path"?: string | null,"source": string,"status": string,"synced_at"?: string,"updated_at": string,"user_id"?: string
                  }
                  Update: {
                    "candidates"?: Json | null,"confidence"?: number | null,"created_at"?: string,"deleted_at"?: string | null,"eaten_at"?: string,"id"?: string,"is_shared_meal"?: boolean,"photo_path"?: string | null,"source"?: string,"status"?: string,"synced_at"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"log_items": {
                  Row: {
                    "custom": Json | null,"dish_id": string,"log_id": string,"oil": string | null,"position": number,"qty": number,"sweetness": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "custom"?: Json | null,"dish_id": string,"log_id": string,"oil"?: string | null,"position": number,"qty": number,"sweetness"?: string | null,"user_id": string
                  }
                  Update: {
                    "custom"?: Json | null,"dish_id"?: string,"log_id"?: string,"oil"?: string | null,"position"?: number,"qty"?: number,"sweetness"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "log_items_user_id_log_id_fkey"
      columns: ["user_id","log_id"]
isOneToOne: false
      referencedRelation: "food_logs"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"passes": {
                  Row: {
                    "amount_ks": number | null,"created_at": string,"ends_at": string,"id": string,"payment_provider": string,"payment_ref": string,"plan": string,"starts_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_ks"?: number | null,"created_at"?: string,"ends_at": string,"id"?: string,"payment_provider": string,"payment_ref": string,"plan": string,"starts_at": string,"user_id": string
                  }
                  Update: {
                    "amount_ks"?: number | null,"created_at"?: string,"ends_at"?: string,"id"?: string,"payment_provider"?: string,"payment_ref"?: string,"plan"?: string,"starts_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "birth_year": number | null,"carb_g_target": number | null,"created_at": string,"eating_places": (string)[],"fat_g_target": number | null,"goal": string | null,"health_flags": (string)[],"height_cm": number | null,"kcal_target": number | null,"language": string,"onboarded": boolean,"pace_kg_week": number | null,"protein_g_target": number | null,"rice_plates_target": number | null,"sex": string | null,"synced_at": string,"target_weight_kg": number | null,"updated_at": string,"uposatha_vegetarian": boolean,"user_id": string,"weight_kg": number | null,"workday": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "birth_year"?: number | null,"carb_g_target"?: number | null,"created_at"?: string,"eating_places"?: (string)[],"fat_g_target"?: number | null,"goal"?: string | null,"health_flags"?: (string)[],"height_cm"?: number | null,"kcal_target"?: number | null,"language"?: string,"onboarded"?: boolean,"pace_kg_week"?: number | null,"protein_g_target"?: number | null,"rice_plates_target"?: number | null,"sex"?: string | null,"synced_at"?: string,"target_weight_kg"?: number | null,"updated_at": string,"uposatha_vegetarian"?: boolean,"user_id"?: string,"weight_kg"?: number | null,"workday"?: string | null
                  }
                  Update: {
                    "birth_year"?: number | null,"carb_g_target"?: number | null,"created_at"?: string,"eating_places"?: (string)[],"fat_g_target"?: number | null,"goal"?: string | null,"health_flags"?: (string)[],"height_cm"?: number | null,"kcal_target"?: number | null,"language"?: string,"onboarded"?: boolean,"pace_kg_week"?: number | null,"protein_g_target"?: number | null,"rice_plates_target"?: number | null,"sex"?: string | null,"synced_at"?: string,"target_weight_kg"?: number | null,"updated_at"?: string,"uposatha_vegetarian"?: boolean,"user_id"?: string,"weight_kg"?: number | null,"workday"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"scan_quota": {
                  Row: {
                    "day": string,"used": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"used"?: number,"user_id": string
                  }
                  Update: {
                    "day"?: string,"used"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"scans": {
                  Row: {
                    "attempts": number,"cache_read_tokens": number | null,"cache_write_tokens": number | null,"charged_day": string | null,"cost_usd": number | null,"created_at": string,"error": string | null,"input_tokens": number | null,"latency_ms": number | null,"log_id": string,"model": string | null,"output_tokens": number | null,"photo_path": string,"response": Json | null,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"cache_read_tokens"?: number | null,"cache_write_tokens"?: number | null,"charged_day"?: string | null,"cost_usd"?: number | null,"created_at"?: string,"error"?: string | null,"input_tokens"?: number | null,"latency_ms"?: number | null,"log_id": string,"model"?: string | null,"output_tokens"?: number | null,"photo_path": string,"response"?: Json | null,"status": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "attempts"?: number,"cache_read_tokens"?: number | null,"cache_write_tokens"?: number | null,"charged_day"?: string | null,"cost_usd"?: number | null,"created_at"?: string,"error"?: string | null,"input_tokens"?: number | null,"latency_ms"?: number | null,"log_id"?: string,"model"?: string | null,"output_tokens"?: number | null,"photo_path"?: string,"response"?: Json | null,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"search_misses": {
                  Row: {
                    "created_at": string,"id": string,"query": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"query": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"query"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"weights": {
                  Row: {
                    "created_at": string,"day": string,"deleted_at": string | null,"synced_at": string,"updated_at": string,"user_id": string,"waist_cm": number | null,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day": string,"deleted_at"?: string | null,"synced_at"?: string,"updated_at": string,"user_id"?: string,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"day"?: string,"deleted_at"?: string | null,"synced_at"?: string,"updated_at"?: string,"user_id"?: string,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "catalogue_misses": {
                  Row: {
                    "food": string | null,"kind": string | null,"last_seen": string | null,"people": number | null,"times": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "begin_scan":
{ Args: { "p_daily_budget_usd"?: number,"p_free_per_day": number,"p_log_id": string,"p_photo_path": string,"p_taken_at": string,"p_user": string }; Returns: Json
                           },
"dev_send_sms":
{ Args: { "event": Json }; Returns: Json
                           },
"finish_scan":
{ Args: { "p_cache_read_tokens": number,"p_cache_write_tokens": number,"p_cost_usd": number,"p_error": string,"p_free_per_day": number,"p_input_tokens": number,"p_latency_ms": number,"p_log_id": string,"p_model": string,"p_ok": boolean,"p_output_tokens": number,"p_response": Json,"p_user": string }; Returns: Json
                           },
"free_scans_per_day":
{ Args: { "p_after": number,"p_first_week": number,"p_user": string }; Returns: number
                           },
"grant_pass":
{ Args: { "p_amount_ks"?: number,"p_plan": string,"p_provider": string,"p_ref": string,"p_user": string }; Returns: {
              "amount_ks": number | null,
"created_at": string,
"ends_at": string,
"id": string,
"payment_provider": string,
"payment_ref": string,
"plan": string,
"starts_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "passes"
        isOneToOne: true
        isSetofReturn: false
      } },
"sync_pull":
{ Args: { "after"?: Json,"page_size"?: number,"since"?: string }; Returns: Json
                           },
"sync_push":
{ Args: { "changes": Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
