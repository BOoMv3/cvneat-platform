import { createClient } from '@supabase/supabase-js'

// Configuration Supabase - Remplacez par vos vraies clés
const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co'
const supabaseAnonKey = 'VOTRE_CLÉ_ANON_ICI' // Remplacez par votre clé anon (pas la service_role !)

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 