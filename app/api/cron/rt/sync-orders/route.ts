import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { MLService } from "@/lib/rentabilidad/ml-service"
import { RT_ML_Account } from "@/lib/rentabilidad/types"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase credentials missing" }, { status: 500 })
    }

    // Security Check: Verify CRON_SECRET
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Allow if CRON_SECRET matches Bearer token or if 'key' query param matches
    // If CRON_SECRET is not set in env, we strictly deny access to prevent accidental exposure
    if (!cronSecret) {
      console.error("CRON_SECRET is not set in environment variables.")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const queryKey = searchParams.get('key')
    
    const isValid = (authHeader === `Bearer ${cronSecret}`) || (queryKey === cronSecret)

    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Check query param for full sync
    const fullHistory = searchParams.get('full') === 'true'

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: accounts, error } = await supabase
      .from("rt_ml_accounts")
      .select("*")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ message: "No accounts found" })
    }

    const mlService = new MLService(supabaseUrl, supabaseKey)
    const results = []

    for (const account of accounts) {
      try {
        const count = await mlService.syncOrders(account as RT_ML_Account, fullHistory)
        results.push({ account: account.name, status: "success", mode: fullHistory ? "full" : "partial", count })
      } catch (err: any) {
        console.error(`Error syncing orders for ${account.name}:`, err)
        results.push({ account: account.name, status: "error", error: err.message })
      }
    }

    return NextResponse.json({ results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
