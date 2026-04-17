import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
    if (typeof window !== 'undefined') {
      console.warn('Supabase: Missing environment variables. Rendering in offline/demo mode.')
    }
    return null
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
