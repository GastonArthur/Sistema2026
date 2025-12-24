"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ShoppingCart,
  Users,
  Settings,
  Plus,
  Edit,
  Trash2,
  Download,
  Filter,
  Package,
  TrendingUp,
  FileText,
  Phone,
  Mail,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { logActivity, hasPermission, getCurrentUser } from "@/lib/auth"
import { logError } from "@/lib/logger"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"

type InventoryItem = {
  id: number
  sku: string
  ean: string | null
  description: string
  cost_without_tax: number
  cost_with_tax: number
  pvp_without_tax: number
  pvp_with_tax: number
  quantity: number
  company: "MAYCAM" | "BLUE DOGO" | "GLOBOBAZAAR"
  channel: "A" | "B"
  date_entered: string
  stock_status: "normal" | "missing" | "excess"
  supplier_id: number | null
  brand_id: number | null
  invoice_number: string | null
  observations: string | null
  created_at: string
  suppliers?: { name: string }
  brands?: { name: string }
}

type Supplier = {
  id: number
  name: string
}

type Brand = {
  id: number
  name: string
}

type WholesaleClient = {
  id: number
  name: string
  business_name: string
  cuit: string
  address: string
  city?: string
  province: string
  contact_person: string
  email: string
  whatsapp: string
  created_at: string
}

type WholesaleOrder = {
  id: number
  client_id: number
  order_date: string
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  total_amount: number
  items: WholesaleOrderItem[]
  notes: string
  created_at: string
  client?: WholesaleClient
}

type WholesaleOrderItem = {
  id: number
  order_id: number
  sku: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

interface MayoristasManagementProps {
  isOpen: boolean
  onClose: () => void
  inventory: InventoryItem[]
  suppliers: Supplier[]
  brands: Brand[]
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500 hover:bg-yellow-600 text-white"
    case "confirmed":
      return "bg-blue-500 hover:bg-blue-600 text-white"
    case "shipped":
      return "bg-purple-500 hover:bg-purple-600 text-white"
    case "delivered":
      return "bg-green-500 hover:bg-green-600 text-white"
    case "cancelled":
      return "bg-red-500 hover:bg-red-600 text-white"
    default:
      return "bg-gray-500 hover:bg-gray-600 text-white"
  }
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    shipped: "Enviado",
    delivered: "Entregado",
    cancelled: "Cancelado",
  }
  return labels[status] || status
}

export function MayoristasManagement({ isOpen, onClose, inventory, suppliers, brands }: MayoristasManagementProps) {
  const currentUser = getCurrentUser()
  const isReadOnly = currentUser?.role === "viewer"

  const [activeTab, setActiveTab] = useState("precios")
  const [wholesaleConfig, setWholesaleConfig] = useState({
    percentage_1: 10,
    percentage_2: 17,
    percentage_3: 25,
  })

  // Estados para clientes
  const [clients, setClients] = useState<WholesaleClient[]>([])
  const [showClientForm, setShowClientForm] = useState(false)
  const [editingClient, setEditingClient] = useState<WholesaleClient | null>(null)
  const [newClient, setNewClient] = useState({
    name: "",
    business_name: "",
    cuit: "",
    address: "",
    city: "",
    province: "",
    contact_person: "",
    email: "",
    whatsapp: "",
  })

  // Estados para pedidos
  const [orders, setOrders] = useState<WholesaleOrder[]>([])
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [orderItems, setOrderItems] = useState<WholesaleOrderItem[]>([])
  const [currentSku, setCurrentSku] = useState("")
  const [currentDescription, setCurrentDescription] = useState("")
  const [currentUnitPrice, setCurrentUnitPrice] = useState(0)
  const [currentQuantity, setCurrentQuantity] = useState(1)
  const [orderNotes, setOrderNotes] = useState("")
  const [viewingClient, setViewingClient] = useState<WholesaleClient | null>(null)

  // Filtros para precios
  const [priceFilters, setPriceFilters] = useState({
    brand: "all",
    search: "",
    showNewOnly: false,
  })

  useEffect(() => {
    if (isOpen) {
      loadWholesaleData()
    }
  }, [isOpen])

  const loadWholesaleData = async () => {
    if (!isSupabaseConfigured) {
      // Simular carga de datos (en modo offline)
      setClients([
        {
          id: 1,
          name: "Distribuidora Norte",
          business_name: "Distribuidora Norte S.A.",
          cuit: "30-12345678-9",
          address: "Av. Libertador 1234",
          province: "Buenos Aires",
          contact_person: "Juan Pérez",
          email: "juan@distribuidoranorte.com",
          whatsapp: "+54911234567",
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Deportes Sur",
          business_name: "Deportes Sur S.R.L.",
          cuit: "30-87654321-0",
          address: "Calle Falsa 456",
          province: "Córdoba",
          contact_person: "María González",
          email: "maria@deportessur.com",
          whatsapp: "+54351987654",
          created_at: new Date().toISOString(),
        },
      ])

      setOrders([
        {
          id: 1,
          client_id: 1,
          order_date: new Date().toISOString().split("T")[0],
          status: "confirmed",
          total_amount: 15000,
          items: [],
          notes: "Pedido urgente para fin de mes",
          created_at: new Date().toISOString(),
        },
      ])

      toast({
        title: "Datos cargados (Offline)",
        description: "Información de mayoristas cargada en modo offline",
      })
      return
    }

    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("wholesale_clients")
        .select("*")
        .order("name")

      if (clientsError) throw clientsError
      setClients(clientsData || [])

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("wholesale_orders")
        .select("*, items:wholesale_order_items(*)")
        .order("created_at", { ascending: false })

      if (ordersError) throw ordersError
      setOrders(ordersData || [])

      // Fetch config
      const { data: configData, error: configError } = await supabase
        .from("config")
        .select("wholesale_percentage_1, wholesale_percentage_2, wholesale_percentage_3")
        .single()

      if (configData) {
        setWholesaleConfig({
          percentage_1: Number(configData.wholesale_percentage_1),
          percentage_2: Number(configData.wholesale_percentage_2),
          percentage_3: Number(configData.wholesale_percentage_3),
        })
      }

      toast({
        title: "Datos actualizados",
        description: "Información de mayoristas cargada desde la base de datos",
      })
    } catch (error) {
      logError("Error loading wholesale data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de mayoristas",
        variant: "destructive",
      })
    }
  }

  const getWholesalePrices = () => {
    const uniqueSkus = new Map<string, InventoryItem>()

    // Obtener el último registro de cada SKU
    inventory.forEach((item) => {
      if (!uniqueSkus.has(item.sku) || new Date(item.created_at) > new Date(uniqueSkus.get(item.sku)!.created_at)) {
        uniqueSkus.set(item.sku, item)
      }
    })

    const wholesalePrices = Array.from(uniqueSkus.values()).map((item) => {
      const baseCost = item.cost_without_tax
      const price1 = baseCost * (1 + wholesaleConfig.percentage_1 / 100)
      const price2 = baseCost * (1 + wholesaleConfig.percentage_2 / 100)
      const price3 = baseCost * (1 + wholesaleConfig.percentage_3 / 100)

      // Verificar si es un SKU nuevo (solo aparece una vez en el inventario)
      const skuCount = inventory.filter((inv) => inv.sku === item.sku).length
      const isNew = skuCount === 1

      return {
        ...item,
        wholesale_price_1: price1,
        wholesale_price_2: price2,
        wholesale_price_3: price3,
        is_new: isNew,
      }
    })

    return wholesalePrices
  }

  const getFilteredWholesalePrices = () => {
    let filtered = getWholesalePrices()

    if (priceFilters.search) {
      filtered = filtered.filter(
        (item) =>
          item.sku.toLowerCase().includes(priceFilters.search.toLowerCase()) ||
          item.description.toLowerCase().includes(priceFilters.search.toLowerCase()),
      )
    }

    if (priceFilters.brand !== "all") {
      filtered = filtered.filter((item) => item.brand_id?.toString() === priceFilters.brand)
    }

    if (priceFilters.showNewOnly) {
      filtered = filtered.filter((item) => item.is_new)
    }

    // Agrupar por marca
    const groupedByBrand = filtered.reduce(
      (acc, item) => {
        const brandName = item.brands?.name || "Sin marca"
        if (!acc[brandName]) {
          acc[brandName] = []
        }
        acc[brandName].push(item)
        return acc
      },
      {} as Record<string, typeof filtered>,
    )

    return groupedByBrand
  }

  const updateWholesaleConfig = async (newConfig: typeof wholesaleConfig) => {
    setWholesaleConfig(newConfig)

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("config").update({
          wholesale_percentage_1: newConfig.percentage_1,
          wholesale_percentage_2: newConfig.percentage_2,
          wholesale_percentage_3: newConfig.percentage_3,
        }).eq("id", 1)

        if (error) throw error
      } catch (error) {
        logError("Error updating config:", error)
        toast({
          title: "Error",
          description: "No se pudo guardar la configuración en la base de datos",
          variant: "destructive",
        })
      }
    }

    await logActivity(
      "UPDATE_WHOLESALE_CONFIG",
      "wholesale_config",
      1,
      wholesaleConfig,
      newConfig,
      "Configuración de precios mayoristas actualizada",
    )

    toast({
      title: "Configuración actualizada",
      description: "Los porcentajes de precios mayoristas han sido actualizados",
    })
  }

  const editClient = async (client: WholesaleClient) => {
    setEditingClient(client)
    setNewClient({
      name: client.name,
      business_name: client.business_name,
      cuit: client.cuit,
      address: client.address,
      province: client.province,
      contact_person: client.contact_person,
      email: client.email,
      whatsapp: client.whatsapp,
    })
    setShowClientForm(true)
  }

  const updateClient = async () => {
    if (!editingClient || !newClient.name || !newClient.business_name || !newClient.cuit) {
      toast({
        title: "Campos requeridos",
        description: "Nombre, razón social y CUIT son obligatorios",
        variant: "destructive",
      })
      return
    }

    const updatedClient: WholesaleClient = {
      ...editingClient,
      ...newClient,
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from("wholesale_clients")
          .update({
            name: updatedClient.name,
            business_name: updatedClient.business_name,
            cuit: updatedClient.cuit,
            address: updatedClient.address,
            city: updatedClient.city,
            province: updatedClient.province,
            contact_person: updatedClient.contact_person,
            email: updatedClient.email,
            whatsapp: updatedClient.whatsapp,
          })
          .eq("id", updatedClient.id)
          
        if (error) throw error
      } catch (error) {
        logError("Error updating client:", error)
        toast({
          title: "Error",
          description: "No se pudo actualizar el cliente en la base de datos",
          variant: "destructive",
        })
        return
      }
    }

    setClients((prev) => prev.map((client) => (client.id === editingClient.id ? updatedClient : client)))
    setNewClient({
      name: "",
      business_name: "",
      cuit: "",
      address: "",
      city: "",
      province: "",
      contact_person: "",
      email: "",
      whatsapp: "",
    })
    setEditingClient(null)
    setShowClientForm(false)

    await logActivity(
      "UPDATE_WHOLESALE_CLIENT",
      "wholesale_clients",
      updatedClient.id,
      editingClient,
      updatedClient,
      `Cliente mayorista ${updatedClient.name} actualizado`,
    )

    toast({
      title: "Cliente actualizado",
      description: `${updatedClient.name} ha sido actualizado correctamente`,
    })
  }

  const deleteClient = async (client: WholesaleClient) => {
    if (!confirm(`¿Está seguro de eliminar el cliente ${client.name}?`)) {
      return
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("wholesale_clients").delete().eq("id", client.id)
        if (error) throw error
      } catch (error) {
        logError("Error deleting client:", error)
        toast({
          title: "Error",
          description: "No se pudo eliminar el cliente de la base de datos",
          variant: "destructive",
        })
        return
      }
    }

    setClients((prev) => prev.filter((c) => c.id !== client.id))

    await logActivity(
      "DELETE_WHOLESALE_CLIENT",
      "wholesale_clients",
      client.id,
      client,
      null,
      `Cliente mayorista ${client.name} eliminado`,
    )

    toast({
      title: "Cliente eliminado",
      description: `${client.name} ha sido eliminado de la lista de clientes mayoristas`,
    })
  }

  const addClient = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    console.log("Adding client...", newClient)
    if (!newClient.name || !newClient.business_name || !newClient.cuit) {
      console.log("Validation failed", newClient)
      toast({
        title: "Campos requeridos",
        description: "Nombre, razón social y CUIT son obligatorios",
        variant: "destructive",
      })
      return
    }

    // Validaciones adicionales
    const cleanCuit = newClient.cuit.replace(/[^0-9]/g, "")
    if (!cleanCuit || cleanCuit.length < 7) {
      toast({
        title: "CUIT/DNI inválido",
        description: "El CUIT/DNI debe contener solo números y ser válido",
        variant: "destructive",
      })
      return
    }

    if (newClient.email && !newClient.email.includes("@")) {
      toast({
        title: "Email inválido",
        description: "El email debe contener @",
        variant: "destructive",
      })
      return
    }

    if (newClient.whatsapp) {
      const cleanWhatsapp = newClient.whatsapp.replace(/[^0-9]/g, "")
      if (!cleanWhatsapp) {
        toast({
          title: "WhatsApp inválido",
          description: "El WhatsApp debe contener solo números",
          variant: "destructive",
        })
        return
      }
    }

    if (editingClient) {
      await updateClient()
      return
    }

    try {
      const user = getCurrentUser()
      const userId = user?.id || null

      if (isSupabaseConfigured) {
        console.log("Using Supabase")
        const { data, error } = await supabase
          .from("wholesale_clients")
          .insert([
            {
              name: newClient.name,
              business_name: newClient.business_name,
              cuit: newClient.cuit,
              address: newClient.address,
              city: newClient.city,
              province: newClient.province,
              contact_person: newClient.contact_person,
              email: newClient.email,
              whatsapp: newClient.whatsapp,
              created_by: userId,
            },
          ])
          .select()
          .single()

        if (error) throw error

        const client: WholesaleClient = data
        setClients((prev) => [...prev, client])

        await logActivity(
          "CREATE_WHOLESALE_CLIENT",
          "wholesale_clients",
          client.id,
          null,
          client,
          `Cliente mayorista ${client.name} creado`,
        )

        toast({
          title: "Cliente agregado",
          description: `${client.name} ha sido agregado a la lista de clientes mayoristas`,
        })
      } else {
        console.log("Offline mode")
        const client: WholesaleClient = {
          id: Date.now(),
          ...newClient,
          created_at: new Date().toISOString(),
        }

        setClients((prev) => [...prev, client])

        await logActivity(
          "CREATE_WHOLESALE_CLIENT",
          "wholesale_clients",
          client.id,
          null,
          client,
          `Cliente mayorista ${client.name} creado`,
        )

        toast({
          title: "Cliente agregado",
          description: `${client.name} ha sido agregado a la lista de clientes mayoristas`,
        })
      }

      setNewClient({
        name: "",
        business_name: "",
        cuit: "",
        address: "",
        city: "",
        province: "",
        contact_person: "",
        email: "",
        whatsapp: "",
      })
      closeClientForm()
    } catch (error) {
      logError("Error adding client:", error)
      toast({
        title: "Error",
        description: "No se pudo agregar el cliente. Revise la consola para más detalles.",
        variant: "destructive",
      })
    }
  }

  const addItemToOrder = () => {
    if (!currentSku || currentQuantity <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Debe ingresar SKU y cantidad mayor a 0",
        variant: "destructive",
      })
      return
    }

    if (!currentDescription || currentUnitPrice <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Debe ingresar descripción y precio unitario",
        variant: "destructive",
      })
      return
    }

    const newItem: WholesaleOrderItem = {
      id: Date.now(),
      order_id: 0,
      sku: currentSku,
      description: currentDescription,
      quantity: currentQuantity,
      unit_price: currentUnitPrice,
      total_price: currentUnitPrice * currentQuantity,
    }

    setOrderItems((prev) => [...prev, newItem])
    setCurrentSku("")
    setCurrentDescription("")
    setCurrentUnitPrice(0)
    setCurrentQuantity(1)
  }

  // Auto-fill details when SKU exists in inventory
  useEffect(() => {
    if (!currentSku) return
    
    const item = inventory.find((i) => i.sku === currentSku)
    if (item) {
      setCurrentDescription(item.description)
      // Default to price list 1
      setCurrentUnitPrice(item.cost_without_tax * (1 + wholesaleConfig.percentage_1 / 100))
    }
  }, [currentSku, inventory, wholesaleConfig])

  const removeItemFromOrder = (id: number) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id))
  }

  const createOrder = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    console.log("Creating order...", { selectedClient, itemsCount: orderItems.length })
    
    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Debe seleccionar un cliente",
        variant: "destructive",
      })
      return
    }

    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un producto",
        variant: "destructive",
      })
      return
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + item.total_price, 0)
    const clientId = parseInt(selectedClient)

    try {
      if (isSupabaseConfigured) {
        console.log("Using Supabase for order")
        const user = getCurrentUser()
        const userId = user?.id || null

        // Create order
        const { data: orderData, error: orderError } = await supabase
          .from("wholesale_orders")
          .insert([
            {
              client_id: clientId,
              order_date: new Date().toISOString(),
              status: "pending",
              total_amount: totalAmount,
              notes: orderNotes,
              created_by: userId,
            },
          ])
          .select()
          .single()

        if (orderError) throw orderError

        // Create order items
        const itemsToInsert = orderItems.map((item) => ({
          order_id: orderData.id,
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }))

        const { error: itemsError } = await supabase.from("wholesale_order_items").insert(itemsToInsert)

        if (itemsError) throw itemsError

        toast({
          title: "Pedido creado",
          description: "El pedido se ha guardado correctamente",
        })

        // Refresh orders
        loadWholesaleData()
      } else {
        console.log("Offline mode for order")
        // Offline mode
        const newOrder: WholesaleOrder = {
          id: Date.now(),
          client_id: clientId,
          order_date: new Date().toISOString(),
          status: "pending",
          total_amount: totalAmount,
          items: orderItems,
          notes: orderNotes,
          created_at: new Date().toISOString(),
        }
        setOrders((prev) => [newOrder, ...prev])
        toast({
          title: "Pedido creado (Offline)",
          description: "El pedido se ha guardado localmente",
        })
      }

      // Reset form
      setShowOrderForm(false)
      setOrderItems([])
      setSelectedClient("")
      setOrderNotes("")
    } catch (error) {
      logError("Error creating order:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el pedido. Revise la consola.",
        variant: "destructive",
      })
    }
  }

  const updateOrderStatus = async (orderId: number, newStatus: WholesaleOrder["status"]) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)))

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("wholesale_orders").update({ status: newStatus }).eq("id", orderId)

        if (error) throw error

        toast({
          title: "Estado actualizado",
          description: `El pedido #${orderId} ha cambiado a ${newStatus}`,
        })
      } catch (error) {
        logError("Error updating order status:", error)
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado en la base de datos",
          variant: "destructive",
        })
        loadWholesaleData()
      }
    } else {
      toast({
        title: "Estado actualizado (Offline)",
        description: `El pedido #${orderId} ha cambiado a ${newStatus}`,
      })
    }
  }

  const exportWholesalePrices = () => {
    if (!hasPermission("EXPORT")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para exportar datos",
        variant: "destructive",
      })
      return
    }

    const groupedPrices = getFilteredWholesalePrices()
    const allPrices = Object.values(groupedPrices).flat()

    const headers = [
      "SKU",
      "Descripción",
      "Marca",
      "Costo Base",
      `Precio ${wholesaleConfig.percentage_1}%`,
      `Precio ${wholesaleConfig.percentage_2}%`,
      `Precio ${wholesaleConfig.percentage_3}%`,
    ]

    const csvRows = allPrices.map((item) => [
      item.sku,
      item.description,
      item.brands?.name || "Sin marca",
      `$${item.cost_without_tax.toFixed(2)}`,
      `$${item.wholesale_price_1.toFixed(2)}`,
      `$${item.wholesale_price_2.toFixed(2)}`,
      `$${item.wholesale_price_3.toFixed(2)}`,
    ])

    const excelContent = `
<html>
<head>
<meta charset="utf-8">
<style>
.header { 
  background-color: #7C3AED; 
  color: white; 
  font-weight: bold; 
  text-align: center; 
  padding: 8px;
  border: 1px solid #5B21B6;
}
.data { 
  text-align: left; 
  padding: 6px;
  border: 1px solid #E5E7EB;
}
.data-number { 
  text-align: right; 
  padding: 6px;
  border: 1px solid #E5E7EB;
}
.new-item { 
  background-color: #FEF3C7; 
  font-weight: bold;
  color: #D97706;
}
table { 
  border-collapse: collapse; 
  width: 100%; 
  font-family: Arial, sans-serif;
  font-size: 12px;
}
</style>
</head>
<body>
<h2 style="text-align: center; color: #7C3AED; margin-bottom: 20px;">PRECIOS MAYORISTAS</h2>
<table>
<tr>
${headers.map((h) => `<th class="header">${h}</th>`).join("")}
</tr>
${csvRows
  .map((row, index) => {
    const item = allPrices[index]
    return `<tr>
    <td class="data">${row[0]}</td>
    <td class="data">${row[1]}</td>
    <td class="data">${row[2]}</td>
    <td class="data-number">${row[3]}</td>
    <td class="data-number">${row[4]}</td>
    <td class="data-number">${row[5]}</td>
    <td class="data-number">${row[6]}</td>

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
    a.download = `precios_mayoristas_${new Date().toISOString().split("T")[0]}.xls`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    logActivity(
      "EXPORT_WHOLESALE",
      null,
      null,
      null,
      { count: allPrices.length },
      `Exportación de precios mayoristas: ${allPrices.length} productos`,
    )

    toast({
      title: "Exportación completada",
      description: `Se exportaron ${allPrices.length} precios mayoristas`,
    })
  }

  const exportCompleteReport = () => {
    if (!hasPermission("EXPORT")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para exportar datos",
        variant: "destructive",
      })
      return
    }

    // Generar datos del reporte completo
    const reportData = {
      period: `${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
      totalSales: 125450,
      totalOrders: 47,
      averageTicket: 2670,
      activeClients: 23,
      growth: 18.5,
      retention: 87,
      activeProducts: 342,
    }

    const clientSales = clients.map((client, index) => ({
      name: client.name,
      businessName: client.business_name,
      province: client.province,
      sales: Math.floor(Math.random() * 50000) + 10000,
      orders: Math.floor(Math.random() * 15) + 3,
      lastOrder: Math.floor(Math.random() * 30) + 1,
    }))

    const productSales = inventory.slice(0, 10).map((item, index) => ({
      sku: item.sku,
      description: item.description,
      quantity: Math.floor(Math.random() * 100) + 20,
      revenue: (Math.floor(Math.random() * 100) + 20) * item.cost_without_tax * 1.2,
    }))

    const excelContent = `
<html>
<head>
<meta charset="utf-8">
<style>
.header { 
  background-color: #7C3AED; 
  color: white; 
  font-weight: bold; 
  text-align: center; 
  padding: 12px;
  border: 1px solid #5B21B6;
  font-size: 14px;
}
.section-header {
  background-color: #F3F4F6;
  font-weight: bold;
  padding: 10px;
  border: 1px solid #D1D5DB;
  font-size: 13px;
}
.data { 
  text-align: left; 
  padding: 8px;
  border: 1px solid #E5E7EB;
  font-size: 12px;
}
.data-number { 
  text-align: right; 
  padding: 8px;
  border: 1px solid #E5E7EB;
  font-size: 12px;
}
.metric-value {
  background-color: #EDE9FE;
  font-weight: bold;
  color: #7C3AED;
  text-align: center;
  padding: 8px;
  border: 1px solid #C4B5FD;
}
table { 
  border-collapse: collapse; 
  width: 100%; 
  font-family: Arial, sans-serif;
  margin-bottom: 20px;
}
h1 { 
  color: #7C3AED; 
  text-align: center; 
  margin-bottom: 30px;
}
h2 { 
  color: #374151; 
  margin-top: 30px; 
  margin-bottom: 15px;
}
</style>
</head>
<body>
<h1>REPORTE COMPLETO DE VENTAS MAYORISTAS</h1>
<p style="text-align: center; color: #6B7280; margin-bottom: 30px;">Período: ${reportData.period}</p>

<h2>MÉTRICAS PRINCIPALES</h2>
<table>
<tr>
<th class="header">Métrica</th>
<th class="header">Valor</th>
<th class="header">Comparativa</th>
</tr>
<tr>
<td class="data">Ventas Totales</td>
<td class="metric-value">$${reportData.totalSales.toLocaleString()}</td>
<td class="data">+${reportData.growth}% vs mes anterior</td>
</tr>
<tr>
<td class="data">Pedidos Realizados</td>
<td class="metric-value">${reportData.totalOrders}</td>
<td class="data">+8% vs mes anterior</td>
</tr>
<tr>
<td class="data">Ticket Promedio</td>
<td class="metric-value">$${reportData.averageTicket.toLocaleString()}</td>
<td class="data">+3% vs mes anterior</td>
</tr>
<tr>
<td class="data">Clientes Activos</td>
<td class="metric-value">${reportData.activeClients}</td>
<td class="data">+12% vs mes anterior</td>
</tr>
<tr>
<td class="data">Retención de Clientes</td>
<td class="metric-value">${reportData.retention}%</td>
<td class="data">Excelente</td>
</tr>
</table>

<h2>VENTAS POR CLIENTE</h2>
<table>
<tr>
<th class="header">Cliente</th>
<th class="header">Razón Social</th>
<th class="header">Provincia</th>
<th class="header">Ventas</th>
<th class="header">Pedidos</th>
<th class="header">Último Pedido</th>
</tr>
${clientSales
  .map(
    (client) => `
<tr>
<td class="data">${client.name}</td>
<td class="data">${client.businessName}</td>
<td class="data">${client.province}</td>
<td class="data-number">$${client.sales.toLocaleString()}</td>
<td class="data-number">${client.orders}</td>
<td class="data">Hace ${client.lastOrder} días</td>
</tr>
`,
  )
  .join("")}
</table>

<h2>PRODUCTOS MÁS VENDIDOS</h2>
<table>
<tr>
<th class="header">SKU</th>
<th class="header">Descripción</th>
<th class="header">Cantidad Vendida</th>
<th class="header">Revenue</th>
</tr>
${productSales
  .map(
    (product) => `
<tr>
<td class="data">${product.sku}</td>
<td class="data">${product.description}</td>
<td class="data-number">${product.quantity} unidades</td>
<td class="data-number">${formatCurrency(product.revenue)}</td>
</tr>
`,
  )
  .join("")}
</table>

<p style="text-align: center; color: #6B7280; margin-top: 40px; font-size: 12px;">
Reporte generado el ${new Date().toLocaleString()} | Sistema de Inventario Mayorista
</p>
</body>
</html>`

    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reporte_completo_mayoristas_${new Date().toISOString().split("T")[0]}.xls`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    logActivity(
      "EXPORT_COMPLETE_REPORT",
      null,
      null,
      null,
      { clients: clientSales.length, products: productSales.length },
      `Exportación de reporte completo mayoristas`,
    )

    toast({
      title: "Reporte exportado",
      description: "Reporte completo de ventas mayoristas exportado a Excel",
    })
  }

  const exportAnalysis = () => {
    if (!hasPermission("EXPORT")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para exportar datos",
        variant: "destructive",
      })
      return
    }

    const analysisData = {
      period: `${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
      growth: 18.5,
      retention: 87,
      activeProducts: 342,
      trends: [
        { metric: "Ventas", trend: "Crecimiento sostenido", percentage: "+18.5%" },
        { metric: "Clientes", trend: "Alta retención", percentage: "87%" },
        { metric: "Productos", trend: "Diversificación", percentage: "342 activos" },
        { metric: "Ticket Promedio", trend: "Incremento gradual", percentage: "+3%" },
      ],
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Análisis de Tendencias - Ventas Mayoristas</title>
<style>
body { 
  font-family: Arial, sans-serif; 
  margin: 40px; 
  color: #374151;
  line-height: 1.6;
}
.header { 
  text-align: center; 
  color: #7C3AED; 
  border-bottom: 3px solid #7C3AED; 
  padding-bottom: 20px;
  margin-bottom: 40px;
}
.metric-card {
  background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%);
  border-left: 5px solid #7C3AED;
  padding: 20px;
  margin: 20px 0;
  border-radius: 8px;
}
.metric-title {
  font-size: 18px;
  font-weight: bold;
  color: #7C3AED;
  margin-bottom: 10px;
}
.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #059669;
  margin: 10px 0;
}
.trend-analysis {
  background: #F9FAFB;
  padding: 25px;
  border-radius: 10px;
  margin: 30px 0;
  border: 1px solid #E5E7EB;
}
.recommendation {
  background: #EDE9FE;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #7C3AED;
  margin: 20px 0;
}
.footer {
  text-align: center;
  color: #6B7280;
  margin-top: 50px;
  padding-top: 20px;
  border-top: 1px solid #E5E7EB;
  font-size: 12px;
}
</style>
</head>
<body>
<div class="header">
<h1>ANÁLISIS DE TENDENCIAS</h1>
<h2>Ventas Mayoristas</h2>
<p>Período: ${analysisData.period}</p>
</div>

<div class="metric-card">
<div class="metric-title">Crecimiento Mensual</div>
<div class="metric-value">+${analysisData.growth}%</div>
<p>Las ventas mayoristas muestran un crecimiento sostenido del 18.5% comparado con el mes anterior, indicando una tendencia positiva en el mercado.</p>
</div>

<div class="metric-card">
<div class="metric-title">Retención de Clientes</div>
<div class="metric-value">${analysisData.retention}%</div>
<p>Excelente nivel de retención de clientes, con un 87% de clientes que realizan compras recurrentes, demostrando alta satisfacción y fidelidad.</p>
</div>

<div class="metric-card">
<div class="metric-title">Productos Activos</div>
<div class="metric-value">${analysisData.activeProducts}</div>
<p>Amplio catálogo de productos con ventas activas, permitiendo diversificación de riesgo y múltiples oportunidades de venta.</p>
</div>

<div class="trend-analysis">
<h3>Análisis de Tendencias Detallado</h3>
${analysisData.trends
  .map(
    (trend) => `
<div style="margin: 15px 0; padding: 15px; background: white; border-radius: 5px;">
<strong>${trend.metric}:</strong> ${trend.trend} (${trend.percentage})
</div>
`,
  )
  .join("")}
</div>

<div class="recommendation">
<h3>Recomendaciones Estratégicas</h3>
<ul>
<li><strong>Mantener el impulso:</strong> Continuar con las estrategias actuales que están generando el crecimiento del 18.5%</li>
<li><strong>Fidelización:</strong> Implementar programas de lealtad para mantener la alta retención del 87%</li>
<li><strong>Diversificación:</strong> Aprovechar el amplio catálogo para cross-selling y up-selling</li>
<li><strong>Análisis predictivo:</strong> Implementar herramientas de forecasting para anticipar demanda</li>
</ul>
</div>

<div class="footer">
Análisis generado el ${new Date().toLocaleString()} | Sistema de Inventario Mayorista<br>
Este reporte contiene información confidencial y está destinado únicamente para uso interno
</div>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `analisis_tendencias_mayoristas_${new Date().toISOString().split("T")[0]}.html`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    logActivity(
      "EXPORT_ANALYSIS",
      null,
      null,
      null,
      { trends: analysisData.trends.length },
      `Exportación de análisis de tendencias mayoristas`,
    )

    toast({
      title: "Análisis exportado",
      description: "Análisis de tendencias exportado a HTML",
    })
  }

  const exportClients = () => {
    if (!hasPermission("EXPORT")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para exportar datos",
        variant: "destructive",
      })
      return
    }

    const clientsData = clients.map((client) => {
      const lastOrder = Math.floor(Math.random() * 30) + 1
      const totalOrders = Math.floor(Math.random() * 20) + 5
      const totalSales = Math.floor(Math.random() * 50000) + 10000
      const frequency = Math.floor(Math.random() * 15) + 7
      const status = lastOrder <= 7 ? "Activo" : lastOrder <= 30 ? "Regular" : "Inactivo"

      return {
        name: client.name,
        businessName: client.business_name,
        cuit: client.cuit,
        address: client.address,
        province: client.province,
        contactPerson: client.contact_person,
        email: client.email,
        whatsapp: client.whatsapp,
        lastOrder: `Hace ${lastOrder} días`,
        totalOrders,
        totalSales: `$${totalSales.toLocaleString()}`,
        frequency: `Cada ${frequency} días`,
        monthlyAverage: (totalOrders / 6).toFixed(1),
        status,
        createdAt: new Date(client.created_at).toLocaleDateString(),
      }
    })

    const headers = [
      "Nombre",
      "Razón Social",
      "CUIT",
      "Dirección",
      "Provincia",
      "Persona de Contacto",
      "Email",
      "WhatsApp",
      "Último Pedido",
      "Total Pedidos",
      "Ventas Totales",
      "Frecuencia de Compra",
      "Promedio Mensual",
      "Estado",
      "Fecha de Registro",
    ]

    const csvContent = [
      headers.join(","),
      ...clientsData.map((client) =>
        [
          `"${client.name}"`,
          `"${client.businessName}"`,
          `"${client.cuit}"`,
          `"${client.address}"`,
          `"${client.province}"`,
          `"${client.contactPerson}"`,
          `"${client.email}"`,
          `"${client.whatsapp}"`,
          `"${client.lastOrder}"`,
          client.totalOrders,
          `"${client.totalSales}"`,
          `"${client.frequency}"`,
          `"${client.monthlyAverage}/mes"`,
          `"${client.status}"`,
          `"${client.createdAt}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `clientes_mayoristas_${new Date().toISOString().split("T")[0]}.csv`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    logActivity(
      "EXPORT_CLIENTS",
      null,
      null,
      null,
      { count: clientsData.length },
      `Exportación de clientes mayoristas: ${clientsData.length} registros`,
    )

    toast({
      title: "Clientes exportados",
      description: `Se exportaron ${clientsData.length} clientes a CSV`,
    })
  }

  const groupedPrices = getFilteredWholesalePrices()
  const totalProducts = Object.values(groupedPrices).flat().length
  const newProducts = Object.values(groupedPrices)
    .flat()
    .filter((item) => item.is_new).length

  const closeClientForm = () => {
    setShowClientForm(false)
    setEditingClient(null)
    setNewClient({
      name: "",
      business_name: "",
      cuit: "",
      address: "",
      city: "",
      province: "",
      contact_person: "",
      email: "",
      whatsapp: "",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-purple-600" />
            Ventas Mayoristas
          </DialogTitle>
          <DialogDescription>Gestión completa de ventas mayoristas, precios y clientes</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="precios" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Precios
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="reportes" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Reportes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="precios" className="space-y-4 h-[calc(95vh-200px)] overflow-y-auto">
            {/* Configuración de porcentajes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuración de Precios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Precio Nivel 1 (%)</Label>
                    <Input
                      type="number"
                      value={wholesaleConfig.percentage_1}
                      onChange={(e) =>
                        setWholesaleConfig((prev) => ({
                          ...prev,
                          percentage_1: Number(e.target.value),
                        }))
                      }
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label>Precio Nivel 2 (%)</Label>
                    <Input
                      type="number"
                      value={wholesaleConfig.percentage_2}
                      onChange={(e) =>
                        setWholesaleConfig((prev) => ({
                          ...prev,
                          percentage_2: Number(e.target.value),
                        }))
                      }
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label>Precio Nivel 3 (%)</Label>
                    <Input
                      type="number"
                      value={wholesaleConfig.percentage_3}
                      onChange={(e) =>
                        setWholesaleConfig((prev) => ({
                          ...prev,
                          percentage_3: Number(e.target.value),
                        }))
                      }
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                {!isReadOnly && (
                  <Button
                    type="button"
                    onClick={() => updateWholesaleConfig(wholesaleConfig)}
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                  >
                    Guardar Configuración
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Filtros */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Buscar</Label>
                  <Input
                    placeholder="SKU o descripción..."
                    value={priceFilters.search}
                    onChange={(e) =>
                      setPriceFilters((prev) => ({
                        ...prev,
                        search: e.target.value,
                      }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Marca</Label>
                  <Select
                    value={priceFilters.brand}
                    onValueChange={(value) =>
                      setPriceFilters((prev) => ({
                        ...prev,
                        brand: value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las marcas</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant={priceFilters.showNewOnly ? "default" : "outline"}
                    onClick={() =>
                      setPriceFilters((prev) => ({
                        ...prev,
                        showNewOnly: !prev.showNewOnly,
                      }))
                    }
                    className="h-8 text-sm w-full"
                    size="sm"
                  >
                    Solo productos NUEVOS
                  </Button>
                </div>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-purple-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-purple-600 text-sm">Total Productos</p>
                    <p className="text-2xl font-bold text-purple-800">{totalProducts}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-yellow-600 text-sm">Productos NUEVOS</p>
                    <p className="text-2xl font-bold text-yellow-800">{newProducts}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-green-600 text-sm">Marcas</p>
                    <p className="text-2xl font-bold text-green-800">{Object.keys(groupedPrices).length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-blue-600 text-sm">Clientes</p>
                    <p className="text-2xl font-bold text-blue-800">{clients.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de precios agrupada por marca */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Lista de Precios Mayoristas</CardTitle>
                <Button onClick={exportWholesalePrices} className="bg-purple-600 hover:bg-purple-700 h-8">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {Object.entries(groupedPrices).map(([brandName, products]) => (
                    <div key={brandName} className="mb-6">
                      <div className="bg-purple-100 px-4 py-2 font-semibold text-purple-800 sticky top-0">
                        {brandName} ({products.length} productos)
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Costo Base</TableHead>
                            <TableHead>Precio {wholesaleConfig.percentage_1}%</TableHead>
                            <TableHead>Precio {wholesaleConfig.percentage_2}%</TableHead>
                            <TableHead>Precio {wholesaleConfig.percentage_3}%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.sku}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell>{formatCurrency(item.cost_without_tax)}</TableCell>
                              <TableCell className="font-medium text-green-600">
                                {formatCurrency(item.wholesale_price_1)}
                              </TableCell>
                              <TableCell className="font-medium text-blue-600">
                                {formatCurrency(item.wholesale_price_2)}
                              </TableCell>
                              <TableCell className="font-medium text-purple-600">
                              {formatCurrency(item.wholesale_price_3)}
                            </TableCell>
                          </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clientes" className="space-y-4 h-[calc(95vh-200px)] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Clientes Mayoristas</h3>
              {!isReadOnly && (
                  <Button onClick={() => setShowClientForm(true)} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Cliente
                  </Button>
                )}
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Razón Social</TableHead>
                      <TableHead>CUIT</TableHead>
                      <TableHead>Provincia</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          <Button 
                            variant="link" 
                            className="p-0 h-auto font-medium text-purple-700 hover:text-purple-900" 
                            onClick={() => setViewingClient(client)}
                          >
                            {client.name}
                          </Button>
                        </TableCell>
                        <TableCell>{client.business_name}</TableCell>
                        <TableCell>{client.cuit}</TableCell>
                        <TableCell>{client.province}</TableCell>
                        <TableCell>{client.contact_person}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            {client.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            {client.whatsapp}
                          </div>
                        </TableCell>
                        <TableCell>
                          {!isReadOnly && (
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => editClient(client)} title="Editar cliente">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteClient(client)}
                                title="Eliminar cliente"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Modal para agregar cliente */}
            {showClientForm && (
              <Dialog open={showClientForm} onOpenChange={closeClientForm}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingClient ? "Editar Cliente Mayorista" : "Nuevo Cliente Mayorista"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre *</Label>
                      <Input
                        value={newClient.name}
                        onChange={(e) => setNewClient((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Razón Social *</Label>
                      <Input
                        value={newClient.business_name}
                        onChange={(e) => setNewClient((prev) => ({ ...prev, business_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>CUIT *</Label>
                      <Input
                        value={newClient.cuit}
                        onChange={(e) => setNewClient((prev) => ({ ...prev, cuit: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Provincia</Label>
                      <Input
                        value={newClient.province}
                        onChange={(e) => setNewClient((prev) => ({ ...prev, province: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Dirección</Label>
                      <Input
                        value={newClient.address}
                        onChange={(e) => setNewClient((prev) => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Ciudad</Label>
                      <Input
                        value={newClient.city || ""}
                        onChange={(e) => setNewClient((prev) => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Persona de Contacto</Label>
                      <Input
                        value={newClient.contact_person}
                        onChange={(e) => setNewClient((prev) => ({ ...prev, contact_person: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newClient.email}
                        onChange={(e) => setNewClient((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>WhatsApp</Label>
                      <Input
                        value={newClient.whatsapp}
                        onChange={(e) => setNewClient((prev) => ({ ...prev, whatsapp: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={closeClientForm}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={addClient} className="bg-purple-600 hover:bg-purple-700">
                      {editingClient ? "Actualizar Cliente" : "Agregar Cliente"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          <TabsContent value="pedidos" className="space-y-4 h-[calc(95vh-200px)] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pedidos Mayoristas</h3>
              {!isReadOnly && (
                  <Button onClick={() => setShowOrderForm(true)} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Pedido
                  </Button>
                )}
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead>Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const clientName = clients.find((c) => c.id === order.client_id)?.name || "Cliente desconocido"
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                          <TableCell>{clientName}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger disabled={isReadOnly} className="focus:outline-none">
                                <Badge className={`cursor-pointer ${getStatusColor(order.status)} border-0`}>
                                  {getStatusLabel(order.status)}
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "pending")}>
                                  Pendiente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "confirmed")}>
                                  Confirmado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "shipped")}>
                                  Enviado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "delivered")}>
                                  Entregado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, "cancelled")}>
                                  Cancelado
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                          <TableCell className="text-right">${order.total_amount.toFixed(2)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{order.notes}</TableCell>
                          <TableCell>{order.items?.length || 0} items</TableCell>
                        </TableRow>
                      )
                    })}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No hay pedidos registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Modal para nuevo pedido */}
            {showOrderForm && (
              <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nuevo Pedido Mayorista</DialogTitle>
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Cliente</Label>
                        <div className="flex gap-2">
                          <Select value={selectedClient} onValueChange={setSelectedClient}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Seleccionar cliente" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => setShowClientForm(true)}
                            title="Nuevo Cliente"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="border p-4 rounded-md bg-gray-50">
                        <h4 className="font-medium mb-2">Agregar Producto</h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>SKU</Label>
                              <Input
                                value={currentSku}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setCurrentSku(val)
                                  const item = inventory.find((i) => i.sku.toLowerCase() === val.toLowerCase())
                                  if (item) {
                                    setCurrentDescription(item.description)
                                    setCurrentUnitPrice(item.cost_without_tax * (1 + wholesaleConfig.percentage_1 / 100))
                                  }
                                }}
                                placeholder="SKU"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") addItemToOrder()
                                }}
                              />
                            </div>
                            <div>
                              <Label>Cantidad</Label>
                              <Input
                                type="number"
                                min="1"
                                value={currentQuantity}
                                onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 1)}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label>Descripción</Label>
                            <Input
                              value={currentDescription}
                              onChange={(e) => setCurrentDescription(e.target.value)}
                              placeholder="Descripción del producto"
                            />
                          </div>
                          
                          <div>
                            <Label>Precio Unitario</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={currentUnitPrice}
                                onChange={(e) => setCurrentUnitPrice(parseFloat(e.target.value) || 0)}
                                className="pl-7"
                              />
                            </div>
                          </div>

                          <Button type="button" onClick={addItemToOrder} className="w-full bg-purple-600 hover:bg-purple-700">
                            <Plus className="w-4 h-4 mr-2" /> Agregar al Pedido
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Notas</Label>
                        <Textarea
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          placeholder="Observaciones sobre el pedido..."
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Items del Pedido</h4>
                      <ScrollArea className="h-[300px] border rounded-md p-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>SKU</TableHead>
                              <TableHead>Cant.</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orderItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.sku}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{formatCurrency(item.total_price)}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={() => removeItemFromOrder(item.id)}>
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            {orderItems.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                  Agregue productos al pedido
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>

                      <div className="flex justify-between items-center text-lg font-bold p-4 bg-purple-50 rounded-md">
                        <span>Total:</span>
                        <span>${orderItems.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}</span>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setShowOrderForm(false)}>
                          Cancelar
                        </Button>
                        <Button type="button" onClick={createOrder} className="bg-purple-600 hover:bg-purple-700">
                          Confirmar Pedido
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          <TabsContent value="reportes" className="space-y-4 h-[calc(95vh-200px)] overflow-y-auto">
            {/* Filtros de reportes */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Filtros de Reportes</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Fecha Desde</Label>
                  <Input
                    type="date"
                    value={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                    onChange={() => {}}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Fecha Hasta</Label>
                  <Input 
                    type="date" 
                    value={new Date().toISOString().split("T")[0]} 
                    onChange={() => {}} 
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Cliente</Label>
                  <Select defaultValue="all">
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los clientes</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button className="bg-purple-600 hover:bg-purple-700 h-8 text-sm w-full">
                    <TrendingUp className="w-3.5 h-3.5 mr-2" />
                    Generar Reporte
                  </Button>
                </div>
              </div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-purple-100 text-sm">Ventas Totales</p>
                    <p className="text-2xl font-bold">{formatCurrency(125450)}</p>
                    <p className="text-xs text-purple-200">+15% vs mes anterior</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-green-100 text-sm">Pedidos Realizados</p>
                    <p className="text-2xl font-bold">47</p>
                    <p className="text-xs text-green-200">+8% vs mes anterior</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-blue-100 text-sm">Ticket Promedio</p>
                    <p className="text-2xl font-bold">$2,670</p>
                    <p className="text-xs text-blue-200">+3% vs mes anterior</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-orange-100 text-sm">Clientes Activos</p>
                    <p className="text-2xl font-bold">23</p>
                    <p className="text-xs text-orange-200">+12% vs mes anterior</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos y análisis */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas por Cliente (Top 10)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {clients.slice(0, 5).map((client, index) => {
                      const salesAmount = Math.floor(Math.random() * 50000) + 10000
                      const percentage = Math.floor(Math.random() * 30) + 10
                      return (
                        <div key={client.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{client.name}</p>
                              <p className="text-sm text-gray-500">{client.province}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${salesAmount.toLocaleString()}</p>
                            <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                              <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Productos Más Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inventory.slice(0, 5).map((item, index) => {
                      const quantity = Math.floor(Math.random() * 100) + 20
                      const revenue = quantity * item.cost_without_tax * 1.2
                      return (
                        <div key={item.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{item.sku}</p>
                              <p className="text-sm text-gray-500">{item.description.substring(0, 30)}...</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{quantity} unidades</p>
                            <p className="text-sm text-gray-500">${revenue.toFixed(0)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Análisis de tendencias */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Tendencias de Ventas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-8 h-8 text-purple-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Crecimiento Mensual</h4>
                    <p className="text-2xl font-bold text-purple-600">+18.5%</p>
                    <p className="text-sm text-gray-500">Comparado con el mes anterior</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Retención de Clientes</h4>
                    <p className="text-2xl font-bold text-green-600">87%</p>
                    <p className="text-sm text-gray-500">Clientes que repiten compras</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Package className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Productos Activos</h4>
                    <p className="text-2xl font-bold text-blue-600">342</p>
                    <p className="text-sm text-gray-500">Con ventas en el período</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Frecuencia de compras */}
            <Card>
              <CardHeader>
                <CardTitle>Frecuencia de Compras por Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Último Pedido</TableHead>
                      <TableHead>Frecuencia</TableHead>
                      <TableHead>Total Pedidos</TableHead>
                      <TableHead>Promedio Mensual</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => {
                      const lastOrder = Math.floor(Math.random() * 30) + 1
                      const totalOrders = Math.floor(Math.random() * 20) + 5
                      const frequency = Math.floor(Math.random() * 15) + 7
                      const monthlyAvg = (totalOrders / 6).toFixed(1)
                      const status = lastOrder <= 7 ? "Activo" : lastOrder <= 30 ? "Regular" : "Inactivo"
                      const statusColor =
                        status === "Activo" ? "bg-green-500" : status === "Regular" ? "bg-yellow-500" : "bg-red-500"

                      return (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>Hace {lastOrder} días</TableCell>
                          <TableCell>Cada {frequency} días</TableCell>
                          <TableCell>{totalOrders}</TableCell>
                          <TableCell>{monthlyAvg}/mes</TableCell>
                          <TableCell>
                            <Badge className={`${statusColor} text-white`}>{status}</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Botones de exportación */}
            <Card>
              <CardHeader>
                <CardTitle>Exportar Reportes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button onClick={exportCompleteReport} className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Reporte Completo
                  </Button>
                  <Button onClick={exportAnalysis} variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar Análisis
                  </Button>
                  <Button onClick={exportClients} variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Exportar Clientes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {viewingClient && (
        <Dialog open={!!viewingClient} onOpenChange={(open) => !open && setViewingClient(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detalles del Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Nombre</Label>
                  <p className="font-medium">{viewingClient.name}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Razón Social</Label>
                  <p className="font-medium">{viewingClient.business_name}</p>
                </div>
                <div>
                  <Label className="text-gray-500">CUIT</Label>
                  <p className="font-medium">{viewingClient.cuit}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Provincia</Label>
                  <p className="font-medium">{viewingClient.province}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Dirección</Label>
                  <p className="font-medium">{viewingClient.address}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Contacto</Label>
                  <p className="font-medium">{viewingClient.contact_person}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <p className="font-medium">{viewingClient.email}</p>
                </div>
                <div>
                  <Label className="text-gray-500">WhatsApp</Label>
                  <p className="font-medium">{viewingClient.whatsapp}</p>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button onClick={() => setViewingClient(null)}>Cerrar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
