import { createClient } from '@supabase/supabase-js'

// Configuration Supabase - Remplacez par vos vraies clés
const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Ymdydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTIxNzIsImV4cCI6MjA2NTQ2ODE3Mn0.srLUcf0DfYxl78CQVGJmGNn9JpbuPRDbQ1QkberNi64' // Remplacez par votre clé anon (pas la service_role !)

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 