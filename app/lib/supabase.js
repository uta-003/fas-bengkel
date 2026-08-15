import { createClient } from '@supabase/supabase-js'

// Tambahkan NEXT_PUBLIC_ di sini agar terbaca oleh frontend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)