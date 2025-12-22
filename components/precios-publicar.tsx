"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, DollarSign, Filter, X, Settings } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { Plus, Trash2 } from "lucide-react"

type PublicInventoryItem = {
  id: number
  sku: string
  description: string
  price: number
  stock: number
  platform?: string
  status?: string
  created_at: string
}

interface PreciosPublicarProps {
  cuotasConfig: {
    cuotas_3_percentage: number
    cuotas_6_percentage: number
    cuotas_9_percentage: number
    cuotas_12_percentage: number
  }
  onUpdateCuotasConfig: (newConfig: {
    cuotas_3_percentage: number
    cuotas_6_percentage: number
    cuotas_9_percentage: number
    cuotas_12_percentage: number
  }) => Promise<void>
}

export function PreciosPublicar({
  cuotasConfig,
  onUpdateCuotasConfig,
}: PreciosPublicarProps) {
  const [publicItems, setPublicItems] = useState<PublicInventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [promociones, setPromociones] = useState<{ [key: string]: number }>({})

  // Form states
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({
    sku: "",
    description: "",
    price: "",
    stock: ""
  })

  const [filters, setFilters] = useState({
    searchSku: "",
  })

  useEffect(() => {
    loadPublicData()
    
    // Cargar promociones guardadas desde localStorage
    const savedPromociones = localStorage.getItem("maycam-promociones")
    if (savedPromociones) {
      try {
        const parsedPromociones = JSON.parse(savedPromociones)
        setPromociones(parsedPromociones)
      } catch (error) {
        console.error("Error al cargar promociones guardadas:", error)
      }
    }
  }, [])

  const loadPublicData = async () => {
    setIsLoading(true)
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("inventory_public")
          .select("*")
          .order("created_at", { ascending: false })
        
        if (error) throw error
        setPublicItems(data || [])
      } catch (error) {
        console.error("Error loading public inventory:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los precios a publicar",
          variant: "destructive",
        })
      }
    } else {
      // Offline mock
      setPublicItems([])
    }
    setIsLoading(false)
  }

  const handleAddItem = async () => {
    if (!newItem.sku || !newItem.description || !newItem.price) {
      toast({
        title: "Campos incompletos",
        description: "Complete SKU, Descripción y Precio",
        variant: "destructive"
      })
      return
    }

    const itemToAd = {
      sku: newItem.sku,
      description: newItem.description,
      price: parseFloat(newItem.price),
      stock: parseInt(newItem.stock || "0"),
      status: 'active',
      created_by: 1 // Default admin
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("inventory_public")
          .insert([itemToAd])
          .select()
          .single()

        if (error) throw error
        
        setPublicItems(prev => [data, ...prev])
        toast({ title: "Producto agregado", description: "Producto agregado a la lista pública" })
        setShowAddForm(false)
        setNewItem({ sku: "", description: "", price: "", stock: "" })
      } catch (error) {
        console.error("Error adding item:", error)
        toast({ title: "Error", description: "No se pudo agregar el producto", variant: "destructive" })
      }
    } else {
      const mockItem = { ...itemToAd, id: Date.now(), created_at: new Date().toISOString() }
      setPublicItems(prev => [mockItem, ...prev])
      setShowAddForm(false)
      setNewItem({ sku: "", description: "", price: "", stock: "" })
    }
  }

  const handleDeleteItem = async (id: number) => {
    if (!confirm("¿Eliminar este producto de la lista pública?")) return

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("inventory_public").delete().eq("id", id)
        if (error) throw error
      } catch (error) {
         console.error("Error deleting item:", error)
         toast({ title: "Error", description: "No se pudo eliminar el producto", variant: "destructive" })
         return
      }
    }
    setPublicItems(prev => prev.filter(i => i.id !== id))
    toast({ title: "Eliminado", description: "Producto eliminado de la lista" })
  }

  const getFilteredInventory = () => {
    let filtered = [...publicItems]

    if (filters.searchSku && filters.searchSku.trim()) {
      filtered = filtered.filter((item) => 
        item.sku.toLowerCase().includes(filters.searchSku.toLowerCase().trim()) ||
        item.description.toLowerCase().includes(filters.searchSku.toLowerCase().trim())
      )
    }

    return filtered
  }

  const calculatePriceWithPromotion = (basePrice: number, promoPercentage: number) => {
    return basePrice * (1 - promoPercentage / 100)
  }

  const calculateInstallmentPrice = (basePrice: number, installmentPercentage: number) => {
    return basePrice * (1 + installmentPercentage / 100)
  }

  const handlePromocionChange = (sku: string, value: string) => {
    const percentage = Number.parseFloat(value) || 0
    const previousPercentage = promociones[sku] || 0
    const newPromociones = {
      ...promociones,
      [sku]: percentage,
    }
    setPromociones(newPromociones)

    // Guardar en localStorage
    localStorage.setItem("maycam-promociones", JSON.stringify(newPromociones))

    // Registrar en el log solo si hay un cambio significativo
    if (Math.abs(percentage - previousPercentage) > 0) {
      const action = percentage > 0 ? "PROMOCION_APLICADA" : "PROMOCION_REMOVIDA"
      const description =
        percentage > 0
          ? `Promoción aplicada: ${percentage}% de descuento en SKU ${sku}`
          : `Promoción removida del SKU ${sku}`

      logActivity(
        action,
        null,
        null,
        null,
        {
          sku: sku,
          previous_percentage: previousPercentage,
          new_percentage: percentage,
          module: "precios_publicar",
        },
        description,
      )
    }
  }

  const exportPreciosToExcel = () => {
    if (!hasPermission("EXPORT")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para exportar datos",
        variant: "destructive",
      })
      return
    }

    const filtered = getFilteredInventory()

    const headers = [
      "SKU",
      "Descripción",
      "Precio",
      "Stock",
      "3 Cuotas",
      "6 Cuotas",
      "9 Cuotas",
      "12 Cuotas",
      "Promoción %",
    ]

    const csvRows = filtered.map((item) => {
      const promocion = promociones[item.sku] || 0
      const basePrice = item.price
      const priceWithPromo = calculatePriceWithPromotion(basePrice, promocion)

      return [
        item.sku,
        item.description,
        `$${basePrice.toFixed(2)}`,
        item.stock,
        `$${calculateInstallmentPrice(priceWithPromo, cuotasConfig.cuotas_3_percentage).toFixed(2)}`,
        `$${calculateInstallmentPrice(priceWithPromo, cuotasConfig.cuotas_6_percentage).toFixed(2)}`,
        `$${calculateInstallmentPrice(priceWithPromo, cuotasConfig.cuotas_9_percentage).toFixed(2)}`,
        `$${calculateInstallmentPrice(priceWithPromo, cuotasConfig.cuotas_12_percentage).toFixed(2)}`,
        promocion > 0 ? `${promocion}%` : "",
      ]
    })

    const excelContent = `
<html>
<head>
<meta charset="utf-8">
<style>
.header { 
  background-color: #F59E0B; 
  color: white; 
  font-weight: bold; 
  text-align: center; 
  padding: 8px;
  border: 1px solid #D97706;
}
.data { 
  text-align: left; 
  padding: 6px;
  border: 1px solid #E5E7EB;
  vertical-align: top;
}
.data-center { 
  text-align: center; 
  padding: 6px;
  border: 1px solid #E5E7EB;
}
.data-number { 
  text-align: right; 
  padding: 6px;
  border: 1px solid #E5E7EB;
}
table { 
  border-collapse: collapse; 
  width: 100%; 
  font-family: Arial, sans-serif;
  font-size: 12px;
}
.promocion { background-color: #FEF3C7; font-weight: bold; }
</style>
</head>
<body>
<table>
<tr>
${headers.map((h) => `<th class="header">${h}</th>`).join("")}
</tr>
${csvRows
  .map((row, index) => {
    const item = filtered[index]
    return `<tr>
    <td class="data">${row[0]}</td>
    <td class="data">${row[1]}</td>
    <td class="data-number">${row[2]}</td>
    <td class="data-center">${row[3]}</td>
    <td class="data-number">${row[4]}</td>
    <td class="data-number">${row[5]}</td>
    <td class="data-number">${row[6]}</td>
    <td class="data-number">${row[7]}</td>
    <td class="data-center ${promociones[item.sku] > 0 ? "promocion" : ""}">${row[8]}</td>
  </tr>`
  })
  .join("")}
</table>
</body>
</html>`

    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `precios_publicar_maycam_${new Date().toISOString().split("T")[0]}.xls`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    // Registrar log de exportación
    logActivity(
      "EXPORT",
      null,
      null,
      null,
      { count: filtered.length, type: "precios_publicar" },
      `Exportación de precios a publicar: ${filtered.length} productos`,
    )

    toast({
      title: "Exportación completada",
      description: `Se exportaron ${filtered.length} productos con precios de publicación`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header con zócalo amarillo */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-yellow-400 to-amber-500 text-white">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <DollarSign className="w-8 h-8" />
            Precios a Publicar
          </CardTitle>
          <p className="text-yellow-100 text-lg">
            Gestione los precios de venta con cuotas y promociones para publicación
          </p>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Filter className="w-5 h-5" />
            Filtros de Precios
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="searchSku" className="text-slate-700 font-medium">
                Buscar SKU
              </Label>
              <Input
                id="searchSku"
                type="text"
                placeholder="Buscar por SKU..."
                value={filters.searchSku}
                onChange={(e) => setFilters((prev) => ({ ...prev, searchSku: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() =>
                setFilters({
                  searchSku: "",
                })
              }
              className="shadow-sm"
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </Button>
            <Button onClick={exportPreciosToExcel} className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar Precios
            </Button>
            <Button
              onClick={() => {
                setPromociones({})
                localStorage.removeItem("maycam-promociones")
                toast({
                  title: "Promociones limpiadas",
                  description: "Todas las promociones han sido eliminadas",
                })
              }}
              variant="outline"
              className="shadow-sm"
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar Promociones
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuración rápida de cuotas */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Settings className="w-5 h-5" />
            Configuración de Cuotas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="cuotas3" className="text-slate-700 font-medium">
                3 Cuotas (%)
              </Label>
              <Input
                id="cuotas3"
                type="number"
                value={cuotasConfig.cuotas_3_percentage}
                onChange={(e) => {
                  const newConfig = { ...cuotasConfig, cuotas_3_percentage: Number(e.target.value) }
                  onUpdateCuotasConfig(newConfig)
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cuotas6" className="text-slate-700 font-medium">
                6 Cuotas (%)
              </Label>
              <Input
                id="cuotas6"
                type="number"
                value={cuotasConfig.cuotas_6_percentage}
                onChange={(e) => {
                  const newConfig = { ...cuotasConfig, cuotas_6_percentage: Number(e.target.value) }
                  onUpdateCuotasConfig(newConfig)
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cuotas9" className="text-slate-700 font-medium">
                9 Cuotas (%)
              </Label>
              <Input
                id="cuotas9"
                type="number"
                value={cuotasConfig.cuotas_9_percentage}
                onChange={(e) => {
                  const newConfig = { ...cuotasConfig, cuotas_9_percentage: Number(e.target.value) }
                  onUpdateCuotasConfig(newConfig)
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cuotas12" className="text-slate-700 font-medium">
                12 Cuotas (%)
              </Label>
              <Input
                id="cuotas12"
                type="number"
                value={cuotasConfig.cuotas_12_percentage}
                onChange={(e) => {
                  const newConfig = { ...cuotasConfig, cuotas_12_percentage: Number(e.target.value) }
                  onUpdateCuotasConfig(newConfig)
                }}
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 Los cambios se aplican automáticamente a todos los precios mostrados en la tabla
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Precios */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-t-lg">
          <CardTitle className="text-amber-800">
            Lista de Precios a Publicar ({getFilteredInventory().length} productos)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-yellow-500 to-amber-600">
                  <TableHead className="font-bold text-white text-center border border-slate-300">SKU</TableHead>
                  <TableHead className="font-bold text-white text-center border border-slate-300">
                    Descripción
                  </TableHead>
                  <TableHead className="font-bold text-white text-center border border-slate-300">Precio</TableHead>
                  <TableHead className="font-bold text-white text-center border border-slate-300">Stock</TableHead>
                  <TableHead className="font-bold text-white text-center border border-slate-300">
                    3 Cuotas (+{cuotasConfig.cuotas_3_percentage}%)
                  </TableHead>
                  <TableHead className="font-bold text-white text-center border border-slate-300">
                    6 Cuotas (+{cuotasConfig.cuotas_6_percentage}%)
                  </TableHead>
                  <TableHead className="font-bold text-white text-center border border-slate-300">
                    9 Cuotas (+{cuotasConfig.cuotas_9_percentage}%)
                  </TableHead>
                  <TableHead className="font-bold text-white text-center border border-slate-300">
                    12 Cuotas (+{cuotasConfig.cuotas_12_percentage}%)
                  </TableHead>
                  <TableHead className="font-bold text-white text-center border border-slate-300">
                    Promoción (%)
                  </TableHead>
                  <TableHead className="font-bold text-white text-center border border-slate-300">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredInventory().map((item) => {
                  const promocion = promociones[item.sku] || 0
                  const basePrice = item.price
                  const priceWithPromo = calculatePriceWithPromotion(basePrice, promocion)

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium border border-slate-200">{item.sku}</TableCell>
                      <TableCell className="border border-slate-200 max-w-xs">{item.description}</TableCell>
                      <TableCell className="border border-slate-200 text-center">
                        {promocion > 0 ? (
                          <div className="space-y-1">
                            <div className="line-through text-gray-500 text-sm">${basePrice.toFixed(2)}</div>
                            <div className="text-green-600 font-bold">${priceWithPromo.toFixed(2)}</div>
                          </div>
                        ) : (
                          <div>${basePrice.toFixed(2)}</div>
                        )}
                      </TableCell>
                      <TableCell className="border border-slate-200 text-center">{item.stock}</TableCell>
                      <TableCell className="border border-slate-200 text-center">
                        ${calculateInstallmentPrice(priceWithPromo, cuotasConfig.cuotas_3_percentage).toFixed(2)}
                      </TableCell>
                      <TableCell className="border border-slate-200 text-center">
                        ${calculateInstallmentPrice(priceWithPromo, cuotasConfig.cuotas_6_percentage).toFixed(2)}
                      </TableCell>
                      <TableCell className="border border-slate-200 text-center">
                        ${calculateInstallmentPrice(priceWithPromo, cuotasConfig.cuotas_9_percentage).toFixed(2)}
                      </TableCell>
                      <TableCell className="border border-slate-200 text-center">
                        ${calculateInstallmentPrice(priceWithPromo, cuotasConfig.cuotas_12_percentage).toFixed(2)}
                      </TableCell>
                      <TableCell className="border border-slate-200 text-center bg-yellow-50">
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            className="w-16 text-center h-8"
                            value={promocion}
                            onChange={(e) => handlePromocionChange(item.sku, e.target.value)}
                          />
                          <span className="text-sm text-slate-500">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="border border-slate-200 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
