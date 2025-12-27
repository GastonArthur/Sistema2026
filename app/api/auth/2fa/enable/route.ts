import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyToken } from "@/lib/totp"

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Configuration error" }, { status: 500 })
    }

    const sessionToken = req.cookies.get("session_token")?.value
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { secret, code } = await req.json()

    if (!secret || !code) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify Token
    const isValid = verifyToken(code, secret)

    if (!isValid) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    }

    // Enable 2FA for user
    const { error: updateError } = await supabase
      .from("users")
      .update({
        two_factor_enabled: true,
        two_factor_secret: secret
      })
      .eq("id", session.user_id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error enabling 2FA:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
