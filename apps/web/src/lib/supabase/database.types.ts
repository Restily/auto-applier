export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "candidate_profiles": {
                  Row: {
                    "contact_email": string | null,"created_at": string,"education": NonNullable<Json>,"experience": NonNullable<Json>,"full_name": string | null,"headline": string | null,"is_complete": boolean | null,"languages": NonNullable<Json>,"links": NonNullable<Json>,"location": string | null,"notice_period": string | null,"phone": string | null,"relocation": string | null,"salary_currency": string | null,"salary_max": number | null,"salary_min": number | null,"salary_period": string | null,"skills": (string)[],"source_resume_id": string | null,"target_titles": (string)[],"updated_at": string,"user_id": string,"version": number,"work_authorization": string | null,"work_authorization_other": string | null,"years_experience": string | null
                  }
                  Insert: {
                    "contact_email"?: string | null,"created_at"?: string,"education"?: NonNullable<Json>,"experience"?: NonNullable<Json>,"full_name"?: string | null,"headline"?: string | null,"is_complete"?: never,"languages"?: NonNullable<Json>,"links"?: NonNullable<Json>,"location"?: string | null,"notice_period"?: string | null,"phone"?: string | null,"relocation"?: string | null,"salary_currency"?: string | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_period"?: string | null,"skills"?: (string)[],"source_resume_id"?: string | null,"target_titles"?: (string)[],"updated_at"?: string,"user_id"?: string,"version"?: number,"work_authorization"?: string | null,"work_authorization_other"?: string | null,"years_experience"?: string | null
                  }
                  Update: {
                    "contact_email"?: string | null,"created_at"?: string,"education"?: NonNullable<Json>,"experience"?: NonNullable<Json>,"full_name"?: string | null,"headline"?: string | null,"is_complete"?: never,"languages"?: NonNullable<Json>,"links"?: NonNullable<Json>,"location"?: string | null,"notice_period"?: string | null,"phone"?: string | null,"relocation"?: string | null,"salary_currency"?: string | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_period"?: string | null,"skills"?: (string)[],"source_resume_id"?: string | null,"target_titles"?: (string)[],"updated_at"?: string,"user_id"?: string,"version"?: number,"work_authorization"?: string | null,"work_authorization_other"?: string | null,"years_experience"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_profiles_source_resume_id_fkey"
      columns: ["source_resume_id"]
isOneToOne: false
      referencedRelation: "resumes"
      referencedColumns: ["id"]
    }
                  ]
                },"credit_ledger": {
                  Row: {
                    "created_at": string,"delta": number,"id": number,"reason": string,"ref_id": string,"ref_type": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"delta": number,"id"?: never,"reason": string,"ref_id": string,"ref_type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"delta"?: number,"id"?: never,"reason"?: string,"ref_id"?: string,"ref_type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"id": string,"ui_locale": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"id": string,"ui_locale"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"ui_locale"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"resumes": {
                  Row: {
                    "attempts": number,"created_at": string,"error_code": string | null,"extracted": Json | null,"file_name": string,"id": string,"is_current": boolean,"mime_type": string,"parsed_at": string | null,"size_bytes": number,"status": string,"storage_path": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"error_code"?: string | null,"extracted"?: Json | null,"file_name": string,"id"?: string,"is_current"?: boolean,"mime_type": string,"parsed_at"?: string | null,"size_bytes": number,"status"?: string,"storage_path": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"error_code"?: string | null,"extracted"?: Json | null,"file_name"?: string,"id"?: string,"is_current"?: boolean,"mime_type"?: string,"parsed_at"?: string | null,"size_bytes"?: number,"status"?: string,"storage_path"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "credit_balances": {
                  Row: {
                    "balance": number | null,"user_id": string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            [_ in never]: never
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
  "public": {
          Enums: {
            
          }
        }
} as const
