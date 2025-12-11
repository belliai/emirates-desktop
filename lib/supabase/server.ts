import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Supabase Server Client Configuration
 * 
 * TODO: To enable Supabase integration, set the following environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 * 
 * You can find these values in your Supabase dashboard:
 * https://supabase.com/dashboard/project/_/settings/api
 * 
 * For local development, create a .env.local file with:
 * NEXT_PUBLIC_SUPABASE_URL=your-project-url
 * NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 * 
 * Currently using placeholder values - the app will fall back to CSV data
 * when Supabase is not configured.
 */
export async function createClient() {
  const cookieStore = await cookies()

  // Hardcoded placeholder values - replace with environment variables when Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"

  // Check if we're using placeholder values
  const isConfigured = 
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key"

  if (!isConfigured) {
    console.log("[Supabase] Using placeholder values - Supabase is not configured. App will use CSV fallback.")
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
