import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isCloudEnabled: boolean = Boolean(url && key)

export const supabase: SupabaseClient | null = isCloudEnabled
  ? createClient(url as string, key as string)
  : null
