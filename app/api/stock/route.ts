import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

type Action =
  | "createBrand"
  | "createProduct"
  | "updateQuantity"
  | "deleteProduct"
  | "getChangeCounts"
  | "verifyProduct"

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 })
    }

    const sessionToken = req.cookies.get("session_token")?.value
    if (!sessionToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select(`
        user_id,
        expires_at,
        users!inner ( id, email, name, is_active )
      `)
      .eq("session_token", sessionToken)
      .maybeSingle()

    if (sessionError || !session || !session.users?.is_active) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    }
    const expiresAt = new Date(session.expires_at)
    if (expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Sesión expirada" }, { status: 401 })
    }

    const body = await req.json()
    const action: Action = body?.action

    if (!action) {
      return NextResponse.json({ error: "Acción requerida" }, { status: 400 })
    }

    if (action === "createBrand") {
      const name: string = (body?.payload?.name || "").toString().trim()
      if (!name) {
        return NextResponse.json({ error: "Nombre de marca requerido" }, { status: 400 })
      }
      const { data: existing } = await supabase.from("stock_brands").select("name").eq("name", name).maybeSingle()
      if (!existing) {
        const { error: insErr } = await supabase.from("stock_brands").insert({ name })
        if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === "createProduct") {
      const { sku, name, brand, quantity } = body?.payload || {}
      const skuV = String(sku || "").toUpperCase().trim()
      const nameV = String(name || "").trim()
      const brandV = String(brand || "").trim()
      const qtyV = Number(quantity)
      if (!skuV || !nameV || !brandV || !Number.isFinite(qtyV) || qtyV < 0) {
        return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
      }
      // Ensure brand
      const { data: existingBrand } = await supabase.from("stock_brands").select("name").eq("name", brandV).maybeSingle()
      if (!existingBrand) {
        const { error: bErr } = await supabase.from("stock_brands").insert({ name: brandV })
        if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 })
      }
      // Ensure sku unique
      const { data: existingProd } = await supabase.from("stock_products").select("id").eq("sku", skuV).maybeSingle()
      if (existingProd) {
        return NextResponse.json({ error: "SKU existente" }, { status: 409 })
      }
      const { data: inserted, error: insErr } = await supabase
        .from("stock_products")
        .insert([{ sku: skuV, name: nameV, brand: brandV, quantity: qtyV }])
        .select("id")
        .single()
      if (insErr || !inserted) {
        return NextResponse.json({ error: insErr?.message || "Error insertando producto" }, { status: 400 })
      }
      const { error: chErr } = await supabase.from("stock_changes").insert([
        {
          product_id: inserted.id,
          sku: skuV,
          old_quantity: 0,
          new_quantity: qtyV,
          user_email: session.users.email || "usuario",
        },
      ])
      if (chErr) {
        await supabase.from("stock_products").delete().eq("id", inserted.id)
        return NextResponse.json({ error: chErr.message }, { status: 400 })
      }
      return NextResponse.json({ ok: true, id: inserted.id })
    }

    if (action === "updateQuantity") {
      const { product_id, sku, old_quantity, new_quantity } = body?.payload || {}
      const pid = Number(product_id)
      const oldQ = Number(old_quantity)
      const newQ = Number(new_quantity)
      if (!Number.isFinite(pid) || !Number.isFinite(oldQ) || !Number.isFinite(newQ) || newQ < 0) {
        return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
      }
      const { error: updErr } = await supabase.from("stock_products").update({ quantity: newQ }).eq("id", pid)
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 400 })
      }
      const { error: chErr } = await supabase.from("stock_changes").insert([
        {
          product_id: pid,
          sku: String(sku || "").toUpperCase(),
          old_quantity: oldQ,
          new_quantity: newQ,
          user_email: session.users.email || "usuario",
        },
      ])
      if (chErr) {
        await supabase.from("stock_products").update({ quantity: oldQ }).eq("id", pid)
        return NextResponse.json({ error: chErr.message }, { status: 400 })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === "deleteProduct") {
      const { product_id } = body?.payload || {}
      const pid = Number(product_id)
      if (!Number.isFinite(pid)) {
        return NextResponse.json({ error: "ID inválido" }, { status: 400 })
      }
      await supabase.from("stock_changes").delete().eq("product_id", pid)
      const { error: delErr } = await supabase.from("stock_products").delete().eq("id", pid)
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 400 })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === "getChangeCounts") {
      const { data, error } = await supabase.from("stock_changes").select("sku")
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      const counts: Record<string, number> = {}
      for (const row of data || []) {
        const k = String((row as any).sku)
        counts[k] = (counts[k] || 0) + 1
      }
      return NextResponse.json({ ok: true, counts })
    }

    if (action === "verifyProduct") {
      const sku: string = (body?.payload?.sku || "").toString().trim().toUpperCase()
      if (!sku) {
        return NextResponse.json({ error: "SKU requerido" }, { status: 400 })
      }
      const { data, error } = await supabase
        .from("stock_products")
        .select("id, sku, name, brand, quantity, created_at, updated_at")
        .eq("sku", sku)
        .maybeSingle()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ ok: true, exists: !!data, product: data || null })
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 })
  }
}
