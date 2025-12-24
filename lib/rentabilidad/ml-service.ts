import { createClient } from "@supabase/supabase-js"
import { RT_ML_Account, RT_ML_Order, RT_Stock_Current } from "./types"

const ML_API_URL = "https://api.mercadolibre.com"

export class MLService {
  private supabaseUrl: string
  private supabaseKey: string

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseUrl = supabaseUrl
    this.supabaseKey = supabaseKey
  }

  private getSupabase() {
    return createClient(this.supabaseUrl, this.supabaseKey)
  }

  // --- Auth & Tokens ---

  async refreshAccessToken(account: RT_ML_Account): Promise<string> {
    try {
      const response = await fetch(`${ML_API_URL}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: process.env.ML_CLIENT_ID || "", // Should be in env
          client_secret: process.env.ML_CLIENT_SECRET || "", // Should be in env
          refresh_token: account.refresh_token,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Update in DB
      const supabase = this.getSupabase()
      await supabase
        .from("rt_ml_accounts")
        .update({
          access_token: data.access_token,
          refresh_token: data.refresh_token, // ML rotates refresh tokens too usually
          access_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id)

      return data.access_token
    } catch (error) {
      console.error("Error refreshing token:", error)
      throw error
    }
  }

  async getValidAccessToken(account: RT_ML_Account): Promise<string> {
    if (account.access_token && account.access_expires_at && new Date(account.access_expires_at) > new Date()) {
      return account.access_token
    }
    return this.refreshAccessToken(account)
  }

  // --- Sync Logic ---

  async syncStock(account: RT_ML_Account) {
    const token = await this.getValidAccessToken(account)
    const sellerId = account.seller_id

    // 1. Get all items
    // This is a simplified version. In reality we need to scroll/paginate.
    // ML API /users/{id}/items/search
    
    let offset = 0
    const limit = 50
    let hasMore = true

    const supabase = this.getSupabase()

    while (hasMore) {
      const searchRes = await fetch(`${ML_API_URL}/users/${sellerId}/items/search?limit=${limit}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!searchRes.ok) break // Log error

      const searchData = await searchRes.json()
      const itemIds = searchData.results || []

      if (itemIds.length === 0) {
        hasMore = false
        break
      }

      // 2. Get item details (multiget)
      const itemsRes = await fetch(`${ML_API_URL}/items?ids=${itemIds.join(",")}&include_attributes=all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      const itemsData = await itemsRes.json()

      for (const itemWrapper of itemsData) {
        const item = itemWrapper.body
        if (!item || item.error) continue

        // Process Variations
        if (item.variations && item.variations.length > 0) {
          for (const variation of item.variations) {
             const sku = this.extractSku(variation, item)
             if (sku) {
               await this.upsertStock(account.id, sku, variation.available_quantity, item.status)
               await this.upsertMapping(account.id, sku, item.id, variation.id)
             }
          }
        } else {
          // Simple item
          const sku = this.extractSku(item, null)
          if (sku) {
            await this.upsertStock(account.id, sku, item.available_quantity, item.status)
            await this.upsertMapping(account.id, sku, item.id, null)
          }
        }
      }

      offset += limit
      if (offset >= searchData.paging.total) hasMore = false
    }
  }

  private extractSku(itemOrVar: any, parent: any | null): string | null {
    // Try seller_sku first
    if (itemOrVar.seller_sku) return itemOrVar.seller_sku
    
    // Try attributes
    const attrs = itemOrVar.attributes || []
    const skuAttr = attrs.find((a: any) => a.id === "SELLER_SKU")
    if (skuAttr) return skuAttr.value_name

    return null
  }

  private async upsertStock(accountId: string, sku: string, qty: number, status: string) {
    const supabase = this.getSupabase()
    
    // Map status
    let stockStatus = "Stock"
    if (qty === 0) stockStatus = "Sin stock"
    if (status === "paused" || status === "closed") stockStatus = "No publicado"

    await supabase.from("rt_stock_current").upsert({
      account_id: accountId,
      sku: sku,
      qty: qty,
      status: stockStatus,
      updated_at: new Date().toISOString()
    })
  }
  
  private async upsertMapping(accountId: string, sku: string, itemId: string, variationId: number | null) {
      const supabase = this.getSupabase()
      await supabase.from("rt_ml_sku_map").upsert({
          account_id: accountId,
          sku: sku,
          item_id: itemId,
          variation_id: variationId,
          last_resolved_at: new Date().toISOString()
      }, { onConflict: "account_id, sku" })
  }

  // --- Jobs ---

  async getLastSync(jobName: string): Promise<Date | null> {
    const supabase = this.getSupabase()
    const { data } = await supabase.from("rt_jobs").select("cursor").eq("name", jobName).single()
    if (data && data.cursor && data.cursor.last_date) {
        return new Date(data.cursor.last_date)
    }
    return null
  }

  async updateLastSync(jobName: string, date: Date) {
      const supabase = this.getSupabase()
      await supabase.from("rt_jobs").upsert({
          name: jobName,
          cursor: { last_date: date.toISOString() },
          updated_at: new Date().toISOString()
      })
  }

  // --- Orders ---
  
  async syncOrders(account: RT_ML_Account) {
      const token = await this.getValidAccessToken(account)
      const sellerId = account.seller_id
      const supabase = this.getSupabase()

      // Get last sync date
      const jobName = `orders_${account.id}`
      const lastDate = await this.getLastSync(jobName)
      
      let dateFrom: Date
      if (lastDate) {
          dateFrom = lastDate
      } else {
          // Default to 7 days ago if never synced
          dateFrom = new Date()
          dateFrom.setDate(dateFrom.getDate() - 7)
      }
      
      const dateFromStr = dateFrom.toISOString()
      
      // We should capture the latest date seen to update cursor
      let maxDate = dateFrom

      // Note: ML API might need pagination for large volumes, assuming limited for now or relying on frequent syncs
      const res = await fetch(`${ML_API_URL}/orders/search?seller=${sellerId}&order.date_created.from=${dateFromStr}&sort=date_asc`, {
          headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) return // Log error

      const data = await res.json()
      const orders = data.results || []

      for (const order of orders) {
          const orderDate = new Date(order.date_created)
          if (orderDate > maxDate) maxDate = orderDate

          // Upsert Order
          await supabase.from("rt_ml_orders").upsert({
              account_id: account.id,
              order_id: order.id,
              status: order.status,
              date_created: order.date_created,
              total_amount: order.total_amount,
              paid_amount: order.paid_amount,
              buyer_id: order.buyer.id,
              shipment_id: order.shipping.id,
              raw: order,
              updated_at: new Date().toISOString()
          })

          // Upsert Items
          // Clean existing items for this order to avoid duplicates on re-sync
          await supabase.from("rt_ml_order_items").delete().match({ account_id: account.id, order_id: order.id })

          for (const item of order.order_items) {
              const sku = item.item.seller_sku || item.item.id // Fallback
              
              await supabase.from("rt_ml_order_items").insert({
                  account_id: account.id,
                  order_id: order.id,
                  sku: sku,
                  item_id: item.item.id,
                  variation_id: item.item.variation_id,
                  title: item.item.title,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  discount: item.unit_price * 0, // Placeholder, need real discount field if available
                  raw: item
              })
          }
      }
      
      // Update cursor
      if (orders.length > 0) {
          await this.updateLastSync(jobName, maxDate)
      }
  }
}
