"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Package, Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { getCurrentUser, logActivity } from "@/lib/auth"

type StockItem = {
  id: number
  sku: string
  name: string
  brand: string
  quantity: number
  created_at: string
  updated_at: string
}

export function StockList() {
  const user = getCurrentUser()
  const readOnly = user?.role === "viewer"

  const [items, setItems] = useState<StockItem[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingDateId, setEditingDateId] = useState<number | null>(null)

  const [filters, setFilters] = useState({
    search: "",
    brand: "all",
    sortBy: "date_desc",
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, itemsPerPage])

  const [form, setForm] = useState({
    name: "",
    sku: "",
    brandMode: "select" as "select" | "new",
    brand: "",
    quantity: "",
  })
  const qtyRef = useRef<HTMLInputElement>(null)
  const editQtyRef = useRef<HTMLInputElement>(null)
  const editDateRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      if (!isSupabaseConfigured) {
        const raw = localStorage.getItem("stock:products")
        const list: StockItem[] = raw ? JSON.parse(raw) : []
        setItems(list)
        const b = Array.from(new Set(list.map((i) => i.brand))).sort()
        setBrands(b)
        return
      }
      const { data: prods, error } = await supabase
        .from("stock_products")
        .select("id, sku, name, brand, quantity, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(2000)
      if (error) throw error
      setItems((prods || []) as StockItem[])
      const { data: brandRows } = await supabase.from("stock_brands").select("name").order("name", { ascending: true })
      setBrands((brandRows || []).map((b: any) => b.name))
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "No se pudo cargar Stock", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const diffById = useMemo(() => {
    const bySku: Record<string, StockItem[]> = {}
    items
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach((it) => {
        if (!bySku[it.sku]) bySku[it.sku] = []
        bySku[it.sku].push(it)
      })
    const map: Record<number, number | null> = {}
    Object.values(bySku).forEach((list) => {
      for (let i = 0; i < list.length; i++) {
        const curr = list[i]
        const prev = i > 0 ? list[i - 1] : null
        map[curr.id] = prev ? curr.quantity - prev.quantity : null
      }
    })
    return map
  }

  const filteredData = useMemo(() => {
    const q = filters.search.toLowerCase()
    let arr = items.filter((i) => {
      const matchesSearch =
        i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q)
      const matchesBrand = filters.brand === "all" ? true : i.brand === filters.brand
      return matchesSearch && matchesBrand
    })
    if (filters.sortBy === "date_desc") {
      arr = arr.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (filters.sortBy === "date_asc") {
      arr = arr.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (filters.sortBy === "brand") {
      arr = arr.slice().sort((a, b) => a.brand.localeCompare(b.brand))
    } else if (filters.sortBy === "name") {
      arr = arr.slice().sort((a, b) => a.name.localeCompare(b.name))
    }
    return arr
  }, [items, filters])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredData.slice(startIndex, endIndex)

  async function saveItem() {
    if (readOnly) return
    try {
      setSaving(true)
      const name = String(form.name || "").trim()
      const sku = String(form.sku || "").trim().toUpperCase()
      const brandValue =
        form.brandMode === "select" ? String(form.brand || "").trim() : String(form.brand || "").trim()
      const qtyNum = Number(form.quantity)
      if (!name || !sku || !brandValue || !Number.isFinite(qtyNum) || qtyNum < 0) {
        toast({ title: "Datos inválidos", description: "Complete todos los campos", variant: "destructive" })
        return
      }

      if (!isSupabaseConfigured) {
        const newId = Math.max(0, ...items.map((i) => i.id)) + 1
        const now = new Date().toISOString()
        const nextItem: StockItem = {
          id: newId,
          sku,
          name,
          brand: brandValue,
          quantity: qtyNum,
          created_at: now,
          updated_at: now,
        }
        const next = [nextItem, ...items]
        setItems(next)
        localStorage.setItem("stock:products", JSON.stringify(next))
        if (!brands.includes(brandValue)) {
          setBrands((prev) => [...prev, brandValue].sort())
        }
        toast({ title: "Guardado", description: "Producto creado" })
        setForm({ name: "", sku: "", brandMode: "select", brand: "", quantity: "" })
        return
      }

      const resp = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "createProduct",
          payload: { sku, name, brand: brandValue, quantity: qtyNum },
        }),
      })
      const json = await resp.json()
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || "Error creando producto")
      }
      const nowItem: StockItem = {
        id: json.id,
        sku,
        name,
        brand: brandValue,
        quantity: qtyNum,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setItems((prev) => [nowItem, ...prev])
      if (!brands.includes(brandValue)) {
        setBrands((prev) => [...prev, brandValue].sort())
      }
      await logActivity(
        "CREATE_STOCK_PRODUCT",
        "stock_products",
        json.id,
        null,
        { sku, name, brand: brandValue, quantity: qtyNum },
        "Creación de producto en Stock"
      )
      toast({ title: "Guardado", description: "Producto creado" })
      setForm({ name: "", sku: "", brandMode: "select", brand: "", quantity: "" })
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "No se pudo guardar el producto", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function updateQuantity(item: StockItem, newQty: number) {
    if (readOnly) return
    try {
      if (!Number.isFinite(newQty) || newQty < 0) {
        toast({ title: "Cantidad inválida", description: "Ingrese un número válido", variant: "destructive" })
        return
      }
      if (!isSupabaseConfigured) {
        const next = items.map((i) => (i.id === item.id ? { ...i, quantity: newQty, updated_at: new Date().toISOString() } : i))
        setItems(next)
        localStorage.setItem("stock:products", JSON.stringify(next))
        toast({ title: "Actualizado", description: "Stock modificado" })
        return
      }
      const resp = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "updateQuantity",
          payload: { product_id: item.id, sku: item.sku, old_quantity: item.quantity, new_quantity: newQty },
        }),
      })
      const json = await resp.json()
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || "Error actualizando stock")
      }
      await logActivity("UPDATE_STOCK_QTY", "stock_products", item.id, { quantity: item.quantity }, { quantity: newQty }, "Actualización de stock")
      toast({ title: "Actualizado", description: "Stock modificado" })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "No se pudo modificar el stock", variant: "destructive" })
    } finally {
      setEditingId(null)
    }
  }

  async function updateCreatedAt(item: StockItem, newDateISO: string) {
    if (readOnly) return
    try {
      const date = new Date(newDateISO)
      if (isNaN(date.getTime())) {
        toast({ title: "Fecha inválida", description: "Ingrese una fecha válida", variant: "destructive" })
        return
      }
      if (!isSupabaseConfigured) {
        const next = items.map((i) => (i.id === item.id ? { ...i, created_at: new Date(newDateISO).toISOString() } : i))
        setItems(next)
        localStorage.setItem("stock:products", JSON.stringify(next))
        toast({ title: "Actualizado", description: "Fecha modificada" })
        return
      }
      const resp = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "updateCreatedAt",
          payload: { product_id: item.id, created_at: newDateISO },
        }),
      })
      const json = await resp.json()
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || "Error actualizando fecha")
      }
      await logActivity("UPDATE_STOCK_DATE", "stock_products", item.id, { created_at: item.created_at }, { created_at: newDateISO }, "Actualización de fecha")
      toast({ title: "Actualizado", description: "Fecha modificada" })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "No se pudo modificar la fecha", variant: "destructive" })
    } finally {
      setEditingDateId(null)
    }
  }

  async function deleteItem(item: StockItem) {
    if (readOnly) return
    const ok = window.confirm(`¿Eliminar producto ${item.sku}?`)
    if (!ok) return
    try {
      if (!isSupabaseConfigured) {
        const next = items.filter((i) => i.id !== item.id)
        setItems(next)
        localStorage.setItem("stock:products", JSON.stringify(next))
        toast({ title: "Eliminado", description: "Producto eliminado" })
        return
      }
      const resp = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "deleteProduct",
          payload: { product_id: item.id },
        }),
      })
      const json = await resp.json()
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || "Error eliminando")
      }
      await logActivity("DELETE_STOCK_PRODUCT", "stock_products", item.id, item, null, "Eliminación de producto en Stock")
      toast({ title: "Eliminado", description: "Producto eliminado" })
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 border-b border-blue-100">
          <CardTitle className="flex items-center justify-between gap-3 text-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-blue-100">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent font-bold text-xl">
                  Lista Stock
                </span>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {filteredData.length} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={readOnly}
                placeholder="Nombre del producto"
              />
            </div>
            <div>
              <Label>SKU</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  disabled={readOnly}
                  className="pl-8"
                  placeholder="SKU"
                />
              </div>
            </div>
            <div>
              <Label>Marca</Label>
              {form.brandMode === "select" ? (
                <Select
                  value={form.brand}
                  onValueChange={(val) => {
                    if (val === "__new__") {
                      setForm((f) => ({ ...f, brandMode: "new", brand: "" }))
                    } else {
                      setForm((f) => ({ ...f, brand: val }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Nueva marca…</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    placeholder="Escribir marca"
                    disabled={readOnly}
                  />
                  <Button variant="outline" onClick={() => setForm((f) => ({ ...f, brandMode: "select", brand: "" }))}>
                    Usar lista
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                ref={qtyRef}
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                disabled={readOnly}
                placeholder="0"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={saveItem} disabled={loading || readOnly} className="bg-emerald-600 hover:bg-emerald-700">
              Guardar
            </Button>
          </div>

          <div className="mt-6 bg-white p-3 rounded-lg border flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="pl-8 h-9 text-sm"
                placeholder="Buscar por nombre, SKU o marca"
              />
            </div>
            <Select value={filters.brand} onValueChange={(val) => setFilters((f) => ({ ...f, brand: val }))}>
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.sortBy} onValueChange={(val) => setFilters((f) => ({ ...f, sortBy: val }))}>
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Fecha desc</SelectItem>
                <SelectItem value="date_asc">Fecha asc</SelectItem>
                <SelectItem value="brand">Marca</SelectItem>
                <SelectItem value="name">Nombre</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(itemsPerPage)} onValueChange={(val) => setItemsPerPage(Number(val))}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Items por página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded overflow-hidden border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">SKU</TableHead>
                  <TableHead className="font-semibold">Nombre</TableHead>
                  <TableHead className="font-semibold">Marca</TableHead>
                  <TableHead className="font-semibold">Cantidad</TableHead>
                  <TableHead className="font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-xs">
                      {editingDateId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={editDateRef}
                            type="datetime-local"
                            defaultValue={new Date(item.created_at).toISOString().slice(0, 16)}
                            className="h-8"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const v = editDateRef.current?.value || new Date(item.created_at).toISOString().slice(0, 16)
                              updateCreatedAt(item, v as string)
                            }}
                          >
                            Guardar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingDateId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <button className="text-blue-700 hover:underline" onClick={() => setEditingDateId(item.id)}>
                          {new Date(item.created_at).toLocaleString()}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.brand}</TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Input ref={editQtyRef} type="number" defaultValue={item.quantity} className="h-8 w-24" />
                          <Button
                            size="sm"
                            onClick={() => {
                              const v = Number(editQtyRef.current?.value || item.quantity)
                              updateQuantity(item, v)
                            }}
                          >
                            Guardar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <span className="font-bold">{item.quantity}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!readOnly && (
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingId(item.id)}>
                            Editar
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteItem(item)}>
                            Eliminar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {currentItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Sin resultados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="text-slate-700">
              Mostrando {filteredData.length > 0 ? startIndex + 1 : 0} a {Math.min(endIndex, filteredData.length)} de{" "}
              {filteredData.length} productos
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium text-slate-700">
                Página {currentPage} de {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
