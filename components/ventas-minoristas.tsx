"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  ShoppingBag,
  Users,
  Plus,
  Search,
  Download,
  Filter,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  CreditCard,
  Truck,
  Package
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

type InventoryItem = {
  id: number
  sku: string
  description: string
  pvp_with_tax: number
  quantity: number
  stock_status: "normal" | "missing" | "excess"
}

type RetailClient = {
  id: number
  name: string
  email: string
  phone: string
  address: string
  created_at: string
}

type RetailSaleItem = {
  id: number
  sku: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

type RetailSale = {
  id: number
  date: string
  client_id: number
  client_name: string
  items: RetailSaleItem[]
  subtotal: number
  discount_percentage: number
  shipping_cost: number
  total: number
  stock_status: "restado" | "pendiente"
  payment_status: "pagado" | "pendiente"
  delivery_status: "entregado" | "pendiente"
  tracking_number?: string
  bultos?: number
  notes?: string
}

interface VentasMinoristasProps {
  isOpen: boolean
  onClose: () => void
  inventory: InventoryItem[]
}

export function VentasMinoristas({ isOpen, onClose, inventory }: VentasMinoristasProps) {
  const [activeTab, setActiveTab] = useState("ventas")
  const [sales, setSales] = useState<RetailSale[]>([])
  const [clients, setClients] = useState<RetailClient[]>([])
  const [showNewSaleForm, setShowNewSaleForm] = useState(false)
  
  // New Sale Form State
  const [newSaleDate, setNewSaleDate] = useState(new Date().toISOString().split("T")[0])
  const [newSaleClient, setNewSaleClient] = useState("")
  const [newSaleItems, setNewSaleItems] = useState<RetailSaleItem[]>([])
  const [currentSku, setCurrentSku] = useState("")
  const [currentManualProduct, setCurrentManualProduct] = useState({ description: "", price: 0 })
  const [discount, setDiscount] = useState(0)
  const [shippingCost, setShippingCost] = useState(0)
  const [shippingMethod, setShippingMethod] = useState("")
  const [stockStatus, setStockStatus] = useState("restado")
  const [paymentStatus, setPaymentStatus] = useState("no_pagado")
  const [deliveryStatus, setDeliveryStatus] = useState("no_entregado")
  const [notes, setNotes] = useState("")

  // Stats
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0)
  const salesCount = sales.length
  const paidSales = sales.filter(s => s.payment_status === "pagado").length
  const deliveredSales = sales.filter(s => s.delivery_status === "entregado").length
  const pendingStock = sales.filter(s => s.stock_status === "pendiente").length

  useEffect(() => {
    // Load initial mock data
    setSales([
      {
        id: 1,
        date: "2024-01-14",
        client_id: 1,
        client_name: "Juan Pérez",
        items: [
          { id: 1, sku: "SKU123", description: "Producto A", quantity: 2, unit_price: 2750, total_price: 5500 }
        ],
        subtotal: 5500,
        discount_percentage: 10,
        shipping_cost: 500,
        total: 5450,
        stock_status: "restado",
        payment_status: "pagado",
        delivery_status: "entregado",
        tracking_number: "CA123456789AR",
        bultos: 1
      },
      {
        id: 2,
        date: "2024-01-15",
        client_id: 2,
        client_name: "María García",
        items: [
          { id: 2, sku: "SKU456", description: "Producto B", quantity: 1, unit_price: 3000, total_price: 3000 }
        ],
        subtotal: 3000,
        discount_percentage: 0,
        shipping_cost: 0,
        total: 3000,
        stock_status: "pendiente",
        payment_status: "pendiente",
        delivery_status: "pendiente",
        bultos: 0
      }
    ])
    
    setClients([
      { id: 1, name: "Juan Pérez", email: "juan@example.com", phone: "123456789", address: "Calle 123", created_at: "2024-01-01" },
      { id: 2, name: "María García", email: "maria@example.com", phone: "987654321", address: "Av. Siempre Viva 742", created_at: "2024-01-02" }
    ])
  }, [])

  const addItemToSale = (sku: string) => {
    const item = inventory.find(i => i.sku === sku)
    if (item) {
      const newItem: RetailSaleItem = {
        id: Date.now(),
        sku: item.sku,
        description: item.description,
        quantity: 1,
        unit_price: item.pvp_with_tax,
        total_price: item.pvp_with_tax
      }
      setNewSaleItems([...newSaleItems, newItem])
      setCurrentSku("")
    } else {
      toast({
        title: "Producto no encontrado",
        description: "El SKU ingresado no existe en el inventario",
        variant: "destructive"
      })
    }
  }

  const addManualItem = () => {
    if (!currentManualProduct.description || currentManualProduct.price <= 0) return
    const newItem: RetailSaleItem = {
      id: Date.now(),
      sku: "MANUAL",
      description: currentManualProduct.description,
      quantity: 1,
      unit_price: currentManualProduct.price,
      total_price: currentManualProduct.price
    }
    setNewSaleItems([...newSaleItems, newItem])
    setCurrentManualProduct({ description: "", price: 0 })
  }

  const calculateTotals = () => {
    const subtotal = newSaleItems.reduce((sum, item) => sum + item.total_price, 0)
    const discountAmount = subtotal * (discount / 100)
    const total = subtotal - discountAmount + shippingCost
    return { subtotal, total }
  }

  const { subtotal, total } = calculateTotals()

  const handleRegisterSale = () => {
    if (!newSaleClient) {
      toast({ title: "Error", description: "Debe seleccionar un cliente", variant: "destructive" })
      return
    }
    if (newSaleItems.length === 0) {
      toast({ title: "Error", description: "Debe agregar productos", variant: "destructive" })
      return
    }

    const newSale: RetailSale = {
      id: Date.now(),
      date: newSaleDate,
      client_id: 0, // Logic to find or create client
      client_name: newSaleClient,
      items: newSaleItems,
      subtotal,
      discount_percentage: discount,
      shipping_cost: shippingCost,
      total,
      stock_status: stockStatus as any,
      payment_status: paymentStatus === "pagado" ? "pagado" : "pendiente",
      delivery_status: deliveryStatus === "entregado" ? "entregado" : "pendiente",
      notes
    }

    setSales([newSale, ...sales])
    setShowNewSaleForm(false)
    resetForm()
    toast({ title: "Venta registrada", description: "La venta se ha registrado correctamente" })
  }

  const resetForm = () => {
    setNewSaleItems([])
    setNewSaleClient("")
    setDiscount(0)
    setShippingCost(0)
    setNotes("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-2">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-green-600" />
              <div>
                <DialogTitle>Gestión de Ventas Minoristas</DialogTitle>
                <DialogDescription>Gestión de ventas minoristas y clientes</DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XCircle className="w-5 h-5" />
            </Button>
          </DialogHeader>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b">
            <TabsList>
              <TabsTrigger value="ventas" className="gap-2">
                <ShoppingBag className="w-4 h-4" /> Ventas
              </TabsTrigger>
              <TabsTrigger value="clientes" className="gap-2">
                <Users className="w-4 h-4" /> Clientes
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
            <TabsContent value="ventas" className="m-0 space-y-6">
              <div className="grid grid-cols-5 gap-4">
                <Card className="bg-emerald-600 text-white">
                  <CardContent className="p-4">
                    <p className="text-emerald-100 text-sm">Total Ventas</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-600 text-white">
                  <CardContent className="p-4">
                    <p className="text-blue-100 text-sm">Cantidad Ventas</p>
                    <p className="text-2xl font-bold">{salesCount}</p>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-500 text-white">
                  <CardContent className="p-4">
                    <p className="text-emerald-100 text-sm">Pagadas</p>
                    <p className="text-2xl font-bold">{paidSales}</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-600 text-white">
                  <CardContent className="p-4">
                    <p className="text-purple-100 text-sm">Entregadas</p>
                    <p className="text-2xl font-bold">{deliveredSales}</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-500 text-white">
                  <CardContent className="p-4">
                    <p className="text-orange-100 text-sm">Stock Pendiente</p>
                    <p className="text-2xl font-bold">{pendingStock}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input placeholder="Buscar por cliente, ID o SKU..." className="pl-9" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2 text-green-600 border-green-600 hover:bg-green-50">
                    <Download className="w-4 h-4" /> Exportar Excel
                  </Button>
                  <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewSaleForm(true)}>
                    <Plus className="w-4 h-4" /> Nueva Venta
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead>Desc.</TableHead>
                        <TableHead>Envío</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado Stock</TableHead>
                        <TableHead>Pagado</TableHead>
                        <TableHead>Entregado</TableHead>
                        <TableHead>Nro. Guía</TableHead>
                        <TableHead>Bultos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-bold">#{sale.id}</TableCell>
                          <TableCell>{sale.date}</TableCell>
                          <TableCell>{sale.client_name}</TableCell>
                          <TableCell>{sale.items.length} item(s)</TableCell>
                          <TableCell>{formatCurrency(sale.subtotal)}</TableCell>
                          <TableCell>{sale.discount_percentage > 0 ? `${sale.discount_percentage}%` : "-"}</TableCell>
                          <TableCell>{sale.shipping_cost > 0 ? formatCurrency(sale.shipping_cost) : "-"}</TableCell>
                          <TableCell className="font-bold">{formatCurrency(sale.total)}</TableCell>
                          <TableCell>
                            {sale.stock_status === "restado" ? (
                              <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 gap-1">
                                <CheckCircle className="w-3 h-3" /> Stock Restado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-50 gap-1">
                                <XCircle className="w-3 h-3" /> Restar Stock
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {sale.payment_status === "pagado" ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">SÍ</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0">NO</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {sale.delivery_status === "entregado" ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">SÍ</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0">NO</Badge>
                            )}
                          </TableCell>
                          <TableCell>{sale.tracking_number || "-"}</TableCell>
                          <TableCell>{sale.bultos || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clientes" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Fecha Registro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map(client => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{client.phone}</TableCell>
                          <TableCell>{client.address}</TableCell>
                          <TableCell>{client.created_at}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {showNewSaleForm && (
          <Dialog open={showNewSaleForm} onOpenChange={setShowNewSaleForm}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Venta</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Venta *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input type="date" className="pl-9" value={newSaleDate} onChange={e => setNewSaleDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <div className="flex gap-2">
                      <Input placeholder="Buscar cliente o escribir nombre..." value={newSaleClient} onChange={e => setNewSaleClient(e.target.value)} />
                      <Button variant="outline" size="icon"><Users className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Agregar Productos</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input 
                        placeholder="Buscar SKU o descripción..." 
                        className="pl-9" 
                        value={currentSku}
                        onChange={e => setCurrentSku(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            addItemToSale(currentSku)
                          }
                        }}
                      />
                    </div>
                    <Button variant="secondary" className="gap-2" onClick={() => addItemToSale(currentSku)}>
                      <Plus className="w-4 h-4" /> Agregar
                    </Button>
                    <Button variant="outline" className="gap-2">
                      + Agregar Manual
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="w-[100px]">Cant.</TableHead>
                          <TableHead className="w-[120px] text-right">Precio Unit.</TableHead>
                          <TableHead className="w-[120px] text-right">Total</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newSaleItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                              No hay productos agregados
                            </TableCell>
                          </TableRow>
                        ) : (
                          newSaleItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="font-medium">{item.description}</div>
                                <div className="text-xs text-gray-500">{item.sku}</div>
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="h-8" 
                                  value={item.quantity} 
                                  onChange={(e) => {
                                    const qty = parseInt(e.target.value) || 0
                                    const newItems = [...newSaleItems]
                                    newItems[index].quantity = qty
                                    newItems[index].total_price = qty * item.unit_price
                                    setNewSaleItems(newItems)
                                  }}
                                />
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                              <TableCell className="text-right font-bold">{formatCurrency(item.total_price)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => {
                                  setNewSaleItems(newSaleItems.filter((_, i) => i !== index))
                                }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>% Descuento (opcional)</Label>
                    <Input 
                      type="number" 
                      value={discount} 
                      onChange={e => setDiscount(parseFloat(e.target.value) || 0)} 
                    />
                    <p className="text-xs text-gray-500">Se aplica sobre el subtotal</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Costo de Envío (opcional)</Label>
                    <Input 
                      type="number" 
                      value={shippingCost} 
                      onChange={e => setShippingCost(parseFloat(e.target.value) || 0)} 
                    />
                    <p className="text-xs text-gray-500">Se suma al total</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Método de Envío</Label>
                    <Select value={shippingMethod} onValueChange={setShippingMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="correo">Correo Argentino</SelectItem>
                        <SelectItem value="andreani">Andreani</SelectItem>
                        <SelectItem value="moto">Moto Mensajería</SelectItem>
                        <SelectItem value="retiro">Retiro en Local</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal productos:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({discount}%):</span>
                      <span>-{formatCurrency(subtotal * (discount / 100))}</span>
                    </div>
                  )}
                  {shippingCost > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Envío:</span>
                      <span>+{formatCurrency(shippingCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t">
                    <span>TOTAL FINAL:</span>
                    <span className="text-emerald-600">{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Estado de Stock</Label>
                    <Select value={stockStatus} onValueChange={setStockStatus}>
                      <SelectTrigger className={stockStatus === "restado" ? "text-green-600" : "text-orange-600"}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restado">✓ Stock Restado</SelectItem>
                        <SelectItem value="pendiente">⚠ Restar Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>¿Pagó?</Label>
                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                      <SelectTrigger className={paymentStatus === "pagado" ? "text-green-600" : "text-red-600"}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pagado">SÍ</SelectItem>
                        <SelectItem value="no_pagado">NO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>¿Entregado/Enviado?</Label>
                    <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                      <SelectTrigger className={deliveryStatus === "entregado" ? "text-green-600" : "text-red-600"}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entregado">SÍ</SelectItem>
                        <SelectItem value="no_entregado">NO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Input placeholder="Observaciones adicionales..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowNewSaleForm(false)}>Cancelar</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleRegisterSale}>Registrar Venta</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
