import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"
  
  // Also check for OAuth state/error parameters
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error, errorDescription)
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  // Handle code exchange
  if (code) {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.redirect(`${origin}/auth/login?error=Configuración de Supabase incompleta`)
    }
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError) {
      // Successfully authenticated
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    console.error("Error exchanging code:", exchangeError)
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent("No se pudo iniciar sesión. Intenta de nuevo.")}`
    )
  }

  // No code provided - might be direct access
  return NextResponse.redirect(`${origin}/auth/login`)
}
