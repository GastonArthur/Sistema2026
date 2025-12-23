"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowRight,
  Plus,
  Download,
  Upload,
  AlertTriangle,
  Filter,
  X,
  Package,
  Users,
  Tag,
  Settings,
  FileSpreadsheet,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Edit,
  Trash2,
  Receipt,
  ShoppingCart,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

// Importar componentes de autenticación
import { LoginForm } from "@/components/login-form"
import { UserHeader } from "@/components/user-header"
import { ActivityLogs } from "@/components/activity-logs"
import { UserManagement } from "@/components/user-management"
import { getCurrentUser, checkSession, logActivity, hasPermission } from "@/lib/auth"
import { PreciosPublicar } from "@/components/precios-publicar"
import { ZentorList } from "@/components/zentor-list"
import { GastosManagement } from "@/components/gastos-management"
import { MayoristasManagement } from "@/components/mayoristas-management"

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

import { formatCurrency } from "@/lib/utils"

export default function InventoryManagement() {
  // Estados de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showLogs, setShowLogs] = useState(false)
  const [showUsers, setShowUsers] = useState(false)
  const [showWholesale, setShowWholesale] = useState(false)
  const [activeTab, setActiveTab] = useState("inventory")
  const [showGastos, setShowGastos] = useState(false)

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [ivaPercentage, setIvaPercentage] = useState(21)
  const [priceAlert, setPriceAlert] = useState<{ show: boolean; message: string; oldPrice: number; newPrice: number }>({
    show: false,
    message: "",
    oldPrice: 0,
    newPrice: 0,
  })
  const [importProgress, setImportProgress] = useState({ show: false, current: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    sku: "",
    ean: "",
    description: "",
    cost_without_tax: "",
    pvp_without_tax: "",
    quantity: "",
    company: "",
    channel: "",
    date_entered: "",
    stock_status: "normal",
    supplier_id: "",
    brand_id: "",
    invoice_number: "",
    observations: "",
  })

  // Filters
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    supplier: "",
    brand: "",
    company: "",
    duplicates: "all",
    sortBy: "date_desc",
    searchSku: "",
  })

  // New supplier/brand forms
  const [newSupplier, setNewSupplier] = useState("")
  const [newBrand, setNewBrand] = useState("")

  // Estados para edición y eliminación
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean
    type: "supplier" | "brand" | "item"
    id: number
    name: string
  }>({ show: false, type: "supplier", id: 0, name: "" })

  const [skuHistoryModal, setSKUHistoryModal] = useState<{
    show: boolean
    sku: string
    history: InventoryItem[]
  }>({ show: false, sku: "", history: [] })

  const [skipPriceCheck, setSkipPriceCheck] = useState(false)
  const [cuotasConfig, setCuotasConfig] = useState({
    cuotas_3_percentage: 20,
    cuotas_6_percentage: 40,
    cuotas_9_percentage: 60,
    cuotas_12_percentage: 80,
  })

  const [currentMonthExpenses, setCurrentMonthExpenses] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)

  const [importPreview, setImportPreview] = useState<{
    show: boolean
    data: any[]
    fileName: string
    summary: {
      total: number
      valid: number
      errors: string[]
    }
  }>({
    show: false,
    data: [],
    fileName: "",
    summary: { total: 0, valid: 0, errors: [] },
  })

  const loadData = async () => {
    if (!isSupabaseConfigured) {
      // Cargar datos base para modo offline
      setSuppliers([
        { id: 1, name: "PROVEEDOR PRINCIPAL" },
        { id: 2, name: "DISTRIBUIDOR NACIONAL" },
        { id: 3, name: "IMPORTADOR DIRECTO" },
      ])
      setBrands([
        { id: 1, name: "MARCA PREMIUM" },
        { id: 2, name: "MARCA ESTÁNDAR" },
        { id: 3, name: "MARCA ECONÓMICA" },
      ])
      setInventory([])

      // Mostrar mensaje sobre datos de prueba en modo offline
      toast({
        title: "Modo Offline",
        description: "Para cargar datos de prueba, configura Supabase y ejecuta el script create-sample-data.sql",
        variant: "default",
      })
      return
    }

    try {
      // Usar Promise.all para cargar datos en paralelo y mejorar rendimiento
      const [inventoryResult, suppliersResult, brandsResult, configResult, cuotasResult, expensesResult] = await Promise.all([
        supabase
          .from("inventory")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000), // Limitar para mejor rendimiento

        supabase.from("suppliers").select("*").order("name"),

        supabase.from("brands").select("*").order("name"),

        supabase.from("config").select("iva_percentage").single(),

        supabase
          .from("config")
          .select("cuotas_3_percentage, cuotas_6_percentage, cuotas_9_percentage, cuotas_12_percentage")
          .single(),

        supabase
          .from("expenses")
          .select("*")
          .order("expense_date", { ascending: false }),
      ])

      // Procesar resultados
      if (inventoryResult.error) throw inventoryResult.error
      if (suppliersResult.error) throw suppliersResult.error
      if (brandsResult.error) throw brandsResult.error

      // Combinar datos manualmente para mejor rendimiento
      const enrichedInventory = (inventoryResult.data || []).map((item) => ({
        ...item,
        suppliers: item.supplier_id
          ? { name: suppliersResult.data?.find((s) => s.id === item.supplier_id)?.name || "" }
          : undefined,
        brands: item.brand_id
          ? { name: brandsResult.data?.find((b) => b.id === item.brand_id)?.name || "" }
          : undefined,
      }))

      setInventory(enrichedInventory)
      setSuppliers(suppliersResult.data || [])
      setBrands(brandsResult.data || [])

      // Configurar IVA
      if (!configResult.error && configResult.data) {
        setIvaPercentage(configResult.data.iva_percentage)
      }

      // Configurar cuotas
      if (!cuotasResult.error && cuotasResult.data) {
        setCuotasConfig({
          cuotas_3_percentage: cuotasResult.data.cuotas_3_percentage || 20,
          cuotas_6_percentage: cuotasResult.data.cuotas_6_percentage || 40,
          cuotas_9_percentage: cuotasResult.data.cuotas_9_percentage || 60,
          cuotas_12_percentage: cuotasResult.data.cuotas_12_percentage || 80,
        })
      }

      // Configurar gastos del mes
      if (!expensesResult.error && expensesResult.data) {
        const total = expensesResult.data.reduce((sum, item) => sum + item.amount, 0)
        setCurrentMonthExpenses(total)
      }

      // Mostrar información sobre datos
      const testDataCount = enrichedInventory.filter((item) => item.observations?.includes("Producto de prueba")).length

      if (testDataCount > 0) {
        toast({
          title: "Datos de prueba detectados",
          description: `Se encontraron ${testDataCount} productos de prueba. Sistema funcionando correctamente.`,
          variant: "default",
        })
      } else if (enrichedInventory.length === 0) {
        toast({
          title: "Base de datos vacía",
          description: "Ejecuta el script 'create-sample-data.sql' para cargar datos de prueba.",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error loading data:", error)
      setIsOnline(false)
      toast({
        title: "Error de conexión",
        description: "Error al cargar los datos. Verificando conexión...",
        variant: "destructive",
      })
    }
  }

  const startAutoRefresh = () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval)
    }

    const interval = setInterval(async () => {
      if (isSupabaseConfigured && isAuthenticated) {
        try {
          await loadData()
          setLastSync(new Date())
          setIsOnline(true)
        } catch (error) {
          console.error("Error en sincronización automática:", error)
          setIsOnline(false)
        }
      }
    }, 30000) // Sincronizar cada 30 segundos

    setAutoRefreshInterval(interval)
  }

  const stopAutoRefresh = () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval)
      setAutoRefreshInterval(null)
    }
  }

  // Verificar sesión al cargar
  useEffect(() => {
    // Inicializar fecha para evitar error de hidratación
    setFormData(prev => ({ ...prev, date_entered: new Date().toISOString().split("T")[0] }))

    const initAuth = async () => {
      const user = await checkSession()
      setIsAuthenticated(!!user)
      setIsLoading(false)
      if (user) {
        await loadData()
        setLastSync(new Date())
        startAutoRefresh() // Iniciar sincronización automática
        // Log de inicio de sistema
        await logActivity("SYSTEM_START", null, null, null, null, "Sistema iniciado correctamente")
      }
    }
    initAuth()

    // Cleanup al desmontar
    return () => {
      stopAutoRefresh()
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (isAuthenticated) {
        loadData()
        startAutoRefresh()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      stopAutoRefresh()
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [isAuthenticated])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    loadData().then(() => {
      setLastSync(new Date())
      startAutoRefresh()
    })
  }

  const handleLogout = () => {
    stopAutoRefresh()
    setIsAuthenticated(false)
    setInventory([])
    setSuppliers([])
    setBrands([])
    setLastSync(null)
  }

  const calculateWithTax = (amount: number) => {
    return amount * (1 + ivaPercentage / 100)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Autocompletar descripción cuando se ingresa un SKU existente
      if (field === "sku" && value.trim()) {
        const existingItem = inventory.find((item) => item.sku.toLowerCase() === value.trim().toLowerCase())
        if (existingItem) {
          updated.description = existingItem.description
          updated.ean = existingItem.ean || ""
          toast({
            title: "SKU encontrado",
            description: `Descripción autocompletada: ${existingItem.description}`,
            variant: "default",
          })
        }
      }

      if (field === "cost_without_tax" && value) {
        const costWithTax = calculateWithTax(Number.parseFloat(value))
        updated.cost_with_tax = costWithTax.toFixed(2)
      }

      if (field === "pvp_without_tax" && value) {
        const pvpWithTax = calculateWithTax(Number.parseFloat(value))
        updated.pvp_with_tax = pvpWithTax.toFixed(2)
      }

      return updated
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    toast({
      title: "Procesando archivo",
      description: `Analizando ${file.name}...`,
    })

    try {
      let text = ""

      // Manejar diferentes tipos de archivo
      if (file.name.toLowerCase().endsWith(".csv")) {
        text = await file.text()
      } else if (file.name.toLowerCase().endsWith(".xls") || file.name.toLowerCase().endsWith(".xlsx")) {
        text = await file.text()

        if (text.includes("<table>")) {
          const parser = new DOMParser()
          const doc = parser.parseFromString(text, "text/html")
          const rows = doc.querySelectorAll("tr")

          const csvLines: string[] = []
          rows.forEach((row) => {
            const cells = row.querySelectorAll("td, th")
            const rowData = Array.from(cells).map((cell) => cell.textContent?.trim() || "")
            if (rowData.length > 0) {
              csvLines.push(rowData.join(";"))
            }
          })

          text = csvLines.join("\n")
        }
      } else {
        toast({
          title: "Error",
          description: "Formato de archivo no soportado. Use CSV, XLS o XLSX.",
          variant: "destructive",
        })
        return
      }

      if (!text || text.trim().length === 0) {
        toast({
          title: "Error",
          description: "El archivo está vacío o no se pudo leer",
          variant: "destructive",
        })
        return
      }

      const lines = text.split(/\r?\n/).filter((line) => line.trim())

      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "El archivo debe tener al menos una fila de encabezados y una de datos",
          variant: "destructive",
        })
        return
      }

      // Detectar separador automáticamente
      let separator = ";"
      const firstLine = lines[0]

      const semicolonCount = (firstLine.match(/;/g) || []).length
      const commaCount = (firstLine.match(/,/g) || []).length
      const tabCount = (firstLine.match(/\t/g) || []).length

      if (semicolonCount > commaCount && semicolonCount > tabCount) {
        separator = ";"
      } else if (tabCount > commaCount && tabCount > semicolonCount) {
        separator = "\t"
      } else if (commaCount > 0) {
        separator = ","
      }

      const headers = firstLine.split(separator).map((h) => h.trim().replace(/"/g, ""))

      // Función para convertir notación científica a número completo
      const convertScientificNotation = (value: string): string => {
        if (!value || typeof value !== "string") return value

        // Detectar si es notación científica (contiene E+ o E-)
        if (value.includes("E+") || value.includes("E-") || value.includes("e+") || value.includes("e-")) {
          try {
            // Convertir a número y luego a string para obtener el valor completo
            const num = Number.parseFloat(value)
            if (!isNaN(num)) {
              // Usar toFixed(0) para números enteros grandes
              return num.toFixed(0)
            }
          } catch (error) {
            console.warn("Error converting scientific notation:", value, error)
          }
        }

        return value
      }

      // Procesar datos para vista previa
      const jsonData: any[] = []
      const errors: string[] = []
      let validCount = 0

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line.trim()) continue

        const values = line.split(separator).map((v) => v.trim().replace(/"/g, ""))

        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })

        // Solo agregar filas que tengan SKU
        if (row.SKU && row.SKU.trim()) {
          // Convertir SKU de notación científica si es necesario
          const originalSku = row.SKU?.toString().trim()
          const convertedSku = convertScientificNotation(originalSku)

          // Actualizar el SKU en el objeto row
          row.SKU = convertedSku

          jsonData.push(row)

          // Validar datos obligatorios usando el SKU convertido
          const sku = convertedSku
          const description = row.DESCRIPCION?.toString().trim()
          const cost = row.COSTO?.toString().trim()
          const pvp = row.PVP?.toString().trim()
          const brand = row.MARCA?.toString().trim()

          if (!sku || !description || !cost || !pvp || !brand) {
            errors.push(
              `Fila ${i + 1}: Faltan datos obligatorios (SKU: ${sku}, DESC: ${description ? "OK" : "FALTA"}, COSTO: ${cost ? "OK" : "FALTA"}, PVP: ${pvp ? "OK" : "FALTA"}, MARCA: ${brand ? "OK" : "FALTA"})`,
            )
          } else if (isNaN(Number.parseFloat(cost)) || isNaN(Number.parseFloat(pvp))) {
            errors.push(`Fila ${i + 1}: Precios inválidos (COSTO: ${cost}, PVP: ${pvp})`)
          } else {
            validCount++
          }
        } else {
          errors.push(`Fila ${i + 1}: SKU faltante o vacío`)
        }
      }

      if (jsonData.length === 0) {
        toast({
          title: "Error",
          description: "El archivo no contiene datos válidos con SKU",
          variant: "destructive",
        })
        return
      }

      // Mostrar vista previa
      setImportPreview({
        show: true,
        data: jsonData,
        fileName: file.name,
        summary: {
          total: jsonData.length,
          valid: validCount,
          errors: errors,
        },
      })

      toast({
        title: "Archivo analizado",
        description: `${jsonData.length} filas encontradas. ${validCount} válidas, ${errors.length} con errores.`,
      })
    } catch (error) {
      console.error("💥 Error analizando archivo:", error)
      toast({
        title: "Error",
        description: `Error al procesar el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`,
        variant: "destructive",
      })
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const confirmImport = async () => {
    const { data: jsonData } = importPreview

    // Mapear columnas exactas
    const columnMapping: { [key: string]: string } = {}
    const expectedColumns = ["SKU", "EAN", "DESCRIPCION", "CANTIDAD", "COSTO", "PVP", "FACTURA", "PROVEEDOR", "MARCA"]
    const firstRow = jsonData[0]
    const availableColumns = Object.keys(firstRow)

    expectedColumns.forEach((expectedCol) => {
      const foundColumn = availableColumns.find(
        (col) => col.toUpperCase().trim() === expectedCol || col.trim() === expectedCol,
      )
      if (foundColumn) {
        columnMapping[expectedCol] = foundColumn
      }
    })

    // Simular importación en modo offline o real
    if (!isSupabaseConfigured) {
      let successCount = 0
      // Cambiar de Math.min(jsonData.length, 5) a procesar todos los datos válidos
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        const sku = String(row[columnMapping["SKU"]] || "").trim()
        const description = row[columnMapping["DESCRIPCION"]]?.toString().trim()
        const cost = row[columnMapping["COSTO"]]?.toString().replace(",", ".")
        const pvp = row[columnMapping["PVP"]]?.toString().replace(",", ".")
        const brand = row[columnMapping["MARCA"]]?.toString().trim()

        // Validar que todos los campos obligatorios estén presentes
        if (
          sku &&
          description &&
          cost &&
          pvp &&
          brand &&
          !isNaN(Number.parseFloat(cost)) &&
          !isNaN(Number.parseFloat(pvp))
        ) {
          const newItem: InventoryItem = {
            id: Date.now() + i,
            sku: sku,
            ean: row[columnMapping["EAN"]]?.toString().trim() || null,
            description: description,
            cost_without_tax: Number.parseFloat(cost),
            cost_with_tax: 0,
            pvp_without_tax: Number.parseFloat(pvp),
            pvp_with_tax: 0,
            quantity: Number.parseInt(row[columnMapping["CANTIDAD"]]?.toString()) || 0,
            company: "MAYCAM",
            channel: "A",
            date_entered: new Date().toISOString().split("T")[0],
            stock_status: "normal",
            supplier_id: null,
            brand_id: null,
            invoice_number: row[columnMapping["FACTURA"]]?.toString().trim() || null,
            observations: "Importado desde archivo Excel (modo offline)",
            created_at: new Date().toISOString(),
          }

          // Calcular precios con IVA
          newItem.cost_with_tax = calculateWithTax(newItem.cost_without_tax)
          newItem.pvp_with_tax = calculateWithTax(newItem.pvp_without_tax)

          setInventory((prev) => [newItem, ...prev])
          successCount++
        }
      }

      // Registrar log de importación
      await logActivity(
        "IMPORT",
        null,
        null,
        null,
        { count: successCount },
        `Importación confirmada: ${successCount} productos`,
      )

      toast({
        title: "Importación completada (Modo Offline)",
        description: `${successCount} productos importados localmente de ${jsonData.length} filas procesadas`,
      })

      setImportPreview({ show: false, data: [], fileName: "", summary: { total: 0, valid: 0, errors: [] } })
      return
    }

    // Importación real con Supabase
    setImportProgress({ show: true, current: 0, total: jsonData.length })

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i]

        // Convertir SKU de notación científica si es necesario
        const originalSku = String(row[columnMapping["SKU"]] || "").trim()
        const sku = convertScientificNotation(originalSku)

        const ean = row[columnMapping["EAN"]]?.toString().trim() || null
        const description = row[columnMapping["DESCRIPCION"]]?.toString().trim()
        const quantityStr = row[columnMapping["CANTIDAD"]]?.toString().trim() || "0"
        const costStr = row[columnMapping["COSTO"]]?.toString().replace(",", ".")
        const pvpStr = row[columnMapping["PVP"]]?.toString().replace(",", ".")
        const invoiceNumber = row[columnMapping["FACTURA"]]?.toString().trim() || null
        const supplierName = row[columnMapping["PROVEEDOR"]]?.toString().trim() || null
        const brandName = row[columnMapping["MARCA"]]?.toString().trim()

        if (!sku || !description || !costStr || !pvpStr || !brandName) {
          errors.push(`Fila ${i + 1}: Datos obligatorios faltantes`)
          errorCount++
          continue
        }

        const quantity = Number.parseInt(quantityStr) || 0
        const cost = Number.parseFloat(costStr)
        const pvp = Number.parseFloat(pvpStr)

        if (isNaN(cost) || isNaN(pvp)) {
          errors.push(`Fila ${i + 1}: Precios inválidos`)
          errorCount++
          continue
        }

        // Crear o obtener proveedor
        let supplierId = null
        if (supplierName) {
          const { data: existingSupplier } = await supabase
            .from("suppliers")
            .select("id")
            .eq("name", supplierName)
            .single()

          if (existingSupplier) {
            supplierId = existingSupplier.id
          } else {
            const { data: newSupplier, error: supplierError } = await supabase
              .from("suppliers")
              .insert([{ name: supplierName }])
              .select("id")
              .single()

            if (!supplierError && newSupplier) {
              supplierId = newSupplier.id
            }
          }
        }

        // Crear o obtener marca
        let brandId = null
        if (brandName) {
          const { data: existingBrand } = await supabase.from("brands").select("id").eq("name", brandName).single()

          if (existingBrand) {
            brandId = existingBrand.id
          } else {
            const { data: newBrand, error: brandError } = await supabase
              .from("brands")
              .insert([{ name: brandName }])
              .select("id")
              .single()

            if (!brandError && newBrand) {
              brandId = newBrand.id
            }
          }
        }

        // Verificar si el SKU ya existe
        const { data: existingProduct } = await supabase.from("inventory").select("id").eq("sku", sku).single()

        if (existingProduct) {
          errors.push(`Fila ${i + 1}: SKU ${sku} ya existe`)
          errorCount++
          continue
        }

        // Crear producto
        const inventoryItem = {
          sku: sku,
          ean: ean,
          description: description,
          cost_without_tax: cost,
          cost_with_tax: calculateWithTax(cost),
          pvp_without_tax: pvp,
          pvp_with_tax: calculateWithTax(pvp),
          quantity: quantity,
          company: "MAYCAM" as const,
          channel: "A" as const,
          date_entered: new Date().toISOString().split("T")[0],
          stock_status: "normal" as const,
          supplier_id: supplierId,
          brand_id: brandId,
          invoice_number: invoiceNumber,
          observations: "Importado desde archivo Excel",
          created_by: getCurrentUser()?.id,
        }

        const { error } = await supabase.from("inventory").insert([inventoryItem])

        if (error) {
          console.error(`❌ Error insertando producto ${sku}:`, error)
          errors.push(`Fila ${i + 1}: Error insertando ${sku}`)
          errorCount++
        } else {
          console.log(`✅ Producto ${sku} insertado correctamente`)
          successCount++
        }
      } catch (error) {
        console.error(`❌ Error procesando fila ${i + 1}:`, error)
        errors.push(`Fila ${i + 1}: Error inesperado`)
        errorCount++
      }

      setImportProgress((prev) => ({ ...prev, current: i + 1 }))
    }

    // Registrar log de importación
    await logActivity(
      "IMPORT",
      null,
      null,
      null,
      { successCount, errorCount },
      `Importación completada: ${successCount} productos importados, ${errorCount} errores`,
    )

    toast({
      title: successCount > 0 ? "Importación completada" : "Error en importación",
      description: `${successCount} productos importados. ${errorCount} errores.${errors.length > 0 ? ` Primeros errores: ${errors.slice(0, 3).join(", ")}` : ""}`,
      variant: successCount > 0 ? "default" : "destructive",
    })

    setImportProgress({ show: false, current: 0, total: 0 })
    setImportPreview({ show: false, data: [], fileName: "", summary: { total: 0, valid: 0, errors: [] } })

    if (successCount > 0) {
      loadData()
      setLastSync(new Date())
    }
  }

  const checkPriceChange = async (sku: string, newCost: number) => {
    console.log("Checking price change for SKU:", sku, "New Cost:", newCost)
    if (!isSupabaseConfigured) return true

    try {
      const { data: existingItem, error } = await supabase
        .from("inventory")
        .select("cost_without_tax")
        .eq("sku", sku)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error("Error checking price change:", error)
        return true // Proceed if check fails
      }

      if (existingItem) {
        console.log("Found existing item:", existingItem)
        if (existingItem.cost_without_tax !== newCost) {
          console.log("Price mismatch. Old:", existingItem.cost_without_tax, "New:", newCost)
          setPriceAlert({
            show: true,
            message: `El SKU ${sku} tiene un precio diferente al último registrado`,
            oldPrice: existingItem.cost_without_tax,
            newPrice: newCost,
          })
          return false
        }
      } else {
        console.log("No existing item found for SKU:", sku)
      }
    } catch (err) {
      console.error("Exception in checkPriceChange:", err)
      return true
    }
    return true
  }

  const addInventoryItem = async (overridePriceCheck = false) => {
    // Verificar permisos
    if (!hasPermission("CREATE_ITEM")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para crear productos",
        variant: "destructive",
      })
      return
    }

    // Validar campos básicos obligatorios
    if (!formData.sku?.trim()) {
      toast({
        title: "Campo requerido",
        description: "El SKU es obligatorio",
        variant: "destructive",
      })
      return
    }

    if (!formData.description?.trim()) {
      toast({
        title: "Campo requerido",
        description: "La descripción es obligatoria",
        variant: "destructive",
      })
      return
    }

    if (!formData.cost_without_tax || Number.parseFloat(formData.cost_without_tax) <= 0) {
      toast({
        title: "Campo requerido",
        description: "El costo sin IVA debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    if (!formData.pvp_without_tax || Number.parseFloat(formData.pvp_without_tax) <= 0) {
      toast({
        title: "Campo requerido",
        description: "El PVP sin IVA debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    if (!formData.quantity || Number.parseInt(formData.quantity) < 0) {
      toast({
        title: "Campo requerido",
        description: "La cantidad debe ser mayor o igual a 0",
        variant: "destructive",
      })
      return
    }

    if (!formData.company) {
      toast({
        title: "Campo requerido",
        description: "Debe seleccionar una empresa",
        variant: "destructive",
      })
      return
    }

    if (!formData.channel) {
      toast({
        title: "Campo requerido",
        description: "Debe seleccionar un canal",
        variant: "destructive",
      })
      return
    }

    // Validar que los números sean válidos
    const costWithoutTax = Number.parseFloat(formData.cost_without_tax)
    const pvpWithoutTax = Number.parseFloat(formData.pvp_without_tax)
    const quantity = Number.parseInt(formData.quantity)

    const inventoryItem = {
      sku: formData.sku.trim(),
      ean: formData.ean?.trim() || null,
      description: formData.description.trim(),
      cost_without_tax: costWithoutTax,
      cost_with_tax: calculateWithTax(costWithoutTax),
      pvp_without_tax: pvpWithoutTax,
      pvp_with_tax: calculateWithTax(pvpWithoutTax),
      quantity: quantity,
      company: formData.company as "MAYCAM" | "BLUE DOGO" | "GLOBOBAZAAR",
      channel: formData.channel as "A" | "B",
      date_entered: formData.date_entered,
      stock_status: formData.stock_status as "normal" | "missing" | "excess",
      supplier_id: formData.supplier_id && formData.supplier_id !== "" ? Number.parseInt(formData.supplier_id) : null,
      brand_id: formData.brand_id && formData.brand_id !== "" ? Number.parseInt(formData.brand_id) : null,
      invoice_number: formData.invoice_number?.trim() || null,
      observations: formData.observations?.trim() || null,
    }

    if (!isSupabaseConfigured) {
      // Modo offline - agregar localmente
      const newItem: InventoryItem = {
        id: Date.now(),
        ...inventoryItem,
        created_at: new Date().toISOString(),
        suppliers: formData.supplier_id
          ? { name: suppliers.find((s) => s.id === Number.parseInt(formData.supplier_id))?.name || "" }
          : undefined,
        brands: formData.brand_id
          ? { name: brands.find((b) => b.id === Number.parseInt(formData.brand_id))?.name || "" }
          : undefined,
      }

      setInventory((prev) => [newItem, ...prev])

      // Registrar log
      await logActivity("CREATE_ITEM", "inventory", newItem.id, null, newItem, `Producto ${newItem.sku} creado`)

      toast({
        title: "Modo Offline - Datos temporales",
        description: "Producto agregado solo localmente. Configure Supabase para persistir los datos.",
        variant: "destructive",
      })

      // Limpiar formulario
      setFormData({
        sku: "",
        ean: "",
        description: "",
        cost_without_tax: "",
        pvp_without_tax: "",
        quantity: "",
        company: "",
        channel: "",
        date_entered: new Date().toISOString().split("T")[0],
        stock_status: "normal",
        supplier_id: "",
        brand_id: "",
        invoice_number: "",
        observations: "",
      })

      setSkipPriceCheck(false)
      return
    }

    try {
      console.log("Adding inventory item...", { sku: formData.sku, overridePriceCheck })
      // Verificar cambio de precio solo si no se ha confirmado previamente
      if (!overridePriceCheck && !skipPriceCheck) {
        const canProceed = await checkPriceChange(formData.sku, costWithoutTax)
        if (!canProceed) {
            console.log("Price check failed (variation detected), waiting for user confirmation")
            return
        }
      }

      // Resetear el flag después de usar
      setSkipPriceCheck(false)

      const user = getCurrentUser()
      const userId = user?.id || null
      console.log("User for creation:", userId)

      const inventoryItemWithUser = {
        ...inventoryItem,
        created_by: userId,
      }

      const { data, error } = await supabase.from("inventory").insert([inventoryItemWithUser]).select().single()

      if (error) {
          console.error("Supabase insert error:", error)
          throw error
      }
      
      console.log("Item added successfully:", data)

      // Registrar log
      await logActivity("CREATE_ITEM", "inventory", data.id, null, data, `Producto ${data.sku} creado`)

      const { data: previousEntry } = await supabase
        .from("inventory")
        .select("cost_without_tax, pvp_without_tax")
        .eq("sku", formData.sku)
        .order("created_at", { ascending: false })
        .limit(2)

      if (previousEntry && previousEntry.length > 1) {
        const oldCost = previousEntry[1].cost_without_tax
        const newCost = costWithoutTax
        const percentageChange = ((newCost - oldCost) / oldCost) * 100

        await supabase.from("price_history").insert([
          {
            sku: formData.sku,
            old_cost_without_tax: oldCost,
            new_cost_without_tax: newCost,
            old_pvp_without_tax: previousEntry[1].pvp_without_tax,
            new_pvp_without_tax: pvpWithoutTax,
            price_change_percentage: percentageChange,
          },
        ])
      }

      toast({
        title: "Éxito",
        description: "Producto agregado correctamente",
      })

      setFormData({
        sku: "",
        ean: "",
        description: "",
        cost_without_tax: "",
        pvp_without_tax: "",
        quantity: "",
        company: "",
        channel: "",
        date_entered: new Date().toISOString().split("T")[0],
        stock_status: "normal",
        supplier_id: "",
        brand_id: "",
        invoice_number: "",
        observations: "",
      })
      setSkipPriceCheck(false)

      loadData()
      setLastSync(new Date())
    } catch (error) {
      console.error("❌ Error adding inventory item:", error)
      toast({
        title: "Error",
        description: "Error al agregar el producto",
        variant: "destructive",
      })
    }
  }

  const confirmPriceChange = async () => {
    setPriceAlert({ show: false, message: "", oldPrice: 0, newPrice: 0 })
    // Usamos el parámetro directo para evitar condiciones de carrera con el estado
    await addInventoryItem(true)
  }

  const addSupplier = async () => {
    if (!hasPermission("CREATE_SUPPLIER")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para crear proveedores",
        variant: "destructive",
      })
      return
    }

    if (!newSupplier.trim()) return

    if (!isSupabaseConfigured) {
      const newSupplierObj = { id: Date.now(), name: newSupplier.trim() } as Supplier
      setSuppliers((prev) => [...prev, newSupplierObj])
      await logActivity(
        "CREATE_SUPPLIER",
        "suppliers",
        newSupplierObj.id,
        null,
        newSupplierObj,
        `Proveedor ${newSupplierObj.name} creado`,
      )
      setNewSupplier("")
      toast({
        title: "Éxito (Modo Offline)",
        description: "Proveedor agregado localmente",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert([
          {
            name: newSupplier.trim(),
            created_by: getCurrentUser()?.id,
          },
        ])
        .select()
        .single()

      if (error) throw error

      await logActivity("CREATE_SUPPLIER", "suppliers", data.id, null, data, `Proveedor ${data.name} creado`)

      setNewSupplier("")
      loadData()
      setLastSync(new Date())
      toast({
        title: "Éxito",
        description: "Proveedor agregado correctamente",
      })
    } catch (error) {
      console.error("Error adding supplier:", error)
      toast({
        title: "Error",
        description: "Error al agregar el proveedor",
        variant: "destructive",
      })
    }
  }

  const addBrand = async () => {
    if (!hasPermission("CREATE_BRAND")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para crear marcas",
        variant: "destructive",
      })
      return
    }

    if (!newBrand.trim()) return

    if (!isSupabaseConfigured) {
      const newBrandObj = { id: Date.now(), name: newBrand.trim() } as Brand
      setBrands((prev) => [...prev, newBrandObj])
      await logActivity("CREATE_BRAND", "brands", newBrandObj.id, null, newBrandObj, `Marca ${newBrandObj.name} creada`)
      setNewBrand("")
      toast({
        title: "Éxito (Modo Offline)",
        description: "Marca agregada localmente",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("brands")
        .insert([
          {
            name: newBrand.trim(),
            created_by: getCurrentUser()?.id,
          },
        ])
        .select()
        .single()

      if (error) throw error

      await logActivity("CREATE_BRAND", "brands", data.id, null, data, `Marca ${data.name} creada`)

      setNewBrand("")
      loadData()
      setLastSync(new Date())
      toast({
        title: "Éxito",
        description: "Marca agregada correctamente",
      })
    } catch (error) {
      console.error("Error adding brand:", error)
      toast({
        title: "Error",
        description: "Error al agregar la marca",
        variant: "destructive",
      })
    }
  }

  const updateIvaPercentage = async (newPercentage: number) => {
    if (!hasPermission("EDIT_CONFIG")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para modificar la configuración",
        variant: "destructive",
      })
      return
    }

    if (!isSupabaseConfigured) {
      const oldPercentage = ivaPercentage
      setIvaPercentage(newPercentage)
      await logActivity(
        "UPDATE_CONFIG",
        "config",
        1,
        { iva_percentage: oldPercentage },
        { iva_percentage: newPercentage },
        `IVA actualizado de ${oldPercentage}% a ${newPercentage}%`,
      )
      toast({
        title: "Éxito (Modo Offline)",
        description: "Porcentaje de IVA actualizado localmente",
      })
      return
    }

    try {
      const { error } = await supabase.from("config").update({ iva_percentage: newPercentage }).eq("id", 1)

      if (error) throw error

      const oldPercentage = ivaPercentage
      setIvaPercentage(newPercentage)

      await logActivity(
        "UPDATE_CONFIG",
        "config",
        1,
        { iva_percentage: oldPercentage },
        { iva_percentage: newPercentage },
        `IVA actualizado de ${oldPercentage}% a ${newPercentage}%`,
      )

      toast({
        title: "Éxito",
        description: "Porcentaje de IVA actualizado",
      })
    } catch (error) {
      console.error("Error updating IVA:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el IVA",
        variant: "destructive",
      })
    }
  }

  const updateCuotasPercentages = async (newConfig: typeof cuotasConfig) => {
    if (!hasPermission("EDIT_CONFIG")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para modificar la configuración",
        variant: "destructive",
      })
      return
    }

    // Actualizar inmediatamente el estado local
    setCuotasConfig(newConfig)

    if (!isSupabaseConfigured) {
      const oldConfig = cuotasConfig
      await logActivity("UPDATE_CONFIG", "config", 1, oldConfig, newConfig, "Configuración de cuotas actualizada")
      toast({
        title: "Éxito (Modo Offline)",
        description: "Configuración de cuotas actualizada localmente",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("config")
        .update({
          cuotas_3_percentage: newConfig.cuotas_3_percentage,
          cuotas_6_percentage: newConfig.cuotas_6_percentage,
          cuotas_9_percentage: newConfig.cuotas_9_percentage,
          cuotas_12_percentage: newConfig.cuotas_12_percentage,
        })
        .eq("id", 1)

      if (error) throw error

      const oldConfig = cuotasConfig

      await logActivity("UPDATE_CONFIG", "config", 1, oldConfig, newConfig, "Configuración de cuotas actualizada")

      toast({
        title: "Éxito",
        description: "Configuración de cuotas actualizada",
      })
    } catch (error) {
      console.error("Error updating cuotas config:", error)
      // Revertir el cambio local si hay error
      setCuotasConfig(cuotasConfig)
      toast({
        title: "Error",
        description: "Error al actualizar la configuración de cuotas",
        variant: "destructive",
      })
    }
  }

  const getFilteredInventory = () => {
    let filtered = [...inventory]

    if (filters.searchSku && filters.searchSku.trim()) {
      filtered = filtered.filter((item) => item.sku.toLowerCase().includes(filters.searchSku.toLowerCase().trim()))
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((item) => item.date_entered >= filters.dateFrom)
    }
    if (filters.dateTo) {
      filtered = filtered.filter((item) => item.date_entered <= filters.dateTo)
    }
    if (filters.supplier && filters.supplier !== "all") {
      filtered = filtered.filter((item) => item.supplier_id?.toString() === filters.supplier)
    }
    if (filters.brand && filters.brand !== "all") {
      filtered = filtered.filter((item) => item.brand_id?.toString() === filters.brand)
    }
    if (filters.company && filters.company !== "all") {
      filtered = filtered.filter((item) => item.company === filters.company)
    }

    if (filters.duplicates && filters.duplicates !== "all") {
      if (filters.duplicates === "duplicated") {
        filtered = filtered.filter((item) => skuStats.skuCounts[item.sku] > 1)
      } else if (filters.duplicates === "unique") {
        filtered = filtered.filter((item) => skuStats.skuCounts[item.sku] === 1)
      }
    }

    switch (filters.sortBy) {
      case "price_asc":
        filtered.sort((a, b) => a.cost_without_tax - b.cost_without_tax)
        break
      case "price_desc":
        filtered.sort((a, b) => b.cost_without_tax - a.cost_without_tax)
        break
      case "date_asc":
        filtered.sort((a, b) => new Date(a.date_entered).getTime() - new Date(b.date_entered).getTime())
        break
      case "date_desc":
        filtered.sort((a, b) => new Date(b.date_entered).getTime() - new Date(a.date_entered).getTime())
        break
      case "sku_duplicates":
        filtered.sort((a, b) => skuStats.skuCounts[b.sku] - skuStats.skuCounts[a.sku])
        break
    }

    return filtered
  }

  const exportToCSV = () => {
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
      "Repeticiones",
      "EAN",
      "Descripción",
      "Costo s/IVA",
      "Costo c/IVA",
      "PVP s/IVA",
      "PVP c/IVA",
      "Variación Precio",
      "Cantidad",
      "Empresa",
      "Canal",
      "Fecha",
      "Estado",
      "Proveedor",
      "Marca",
      "Nº Factura",
      "Observaciones",
    ]

    const csvRows = filtered.map((item) => [
      item.sku,
      skuStats.skuCounts[item.sku],
      item.ean || "",
      item.description,
      formatCurrency(item.cost_without_tax),
      formatCurrency(item.cost_with_tax),
      formatCurrency(item.pvp_without_tax),
      formatCurrency(item.pvp_with_tax),
      priceVariations[item.sku]?.hasVariation
        ? `${priceVariations[item.sku].isIncrease ? "+" : "-"}${priceVariations[item.sku].percentage.toFixed(1)}%`
        : "Sin variación",
      item.quantity,
      item.company,
      item.channel,
      item.date_entered,
      item.stock_status === "normal" ? "Normal" : item.stock_status === "missing" ? "Faltó" : "Sobró",
      item.suppliers?.name || "",
      item.brands?.name || "",
      item.invoice_number || "",
      item.observations || "",
    ])

    const csvContent = [headers.join(";"), ...csvRows.map((row) => row.join(";"))].join("\n")

    const excelContent = `
<html>
<head>
<meta charset="utf-8">
<style>
.header { 
  background-color: #3B82F6; 
  color: white; 
  font-weight: bold; 
  text-align: center; 
  padding: 8px;
  border: 1px solid #1E40AF;
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
.empresa { background-color: #DBEAFE; }
.estado-normal { background-color: #D1FAE5; }
.estado-missing { background-color: #FEE2E2; }
.estado-excess { background-color: #FEF3C7; }
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
    <td class="data-center">${row[1]}</td>
    <td class="data">${row[2]}</td>
    <td class="data">${row[3]}</td>
    <td class="data-number">${row[4]}</td>
    <td class="data-number">${row[5]}</td>
    <td class="data-number">${row[6]}</td>
    <td class="data-number">${row[7]}</td>
    <td class="data-center ${
      priceVariations[item.sku]?.hasVariation
        ? priceVariations[item.sku].isIncrease
          ? "text-red-600"
          : "text-green-600"
        : "text-gray-400"
    }">${row[8]}</td>
    <td class="data-center">${row[9]}</td>
    <td class="data-center empresa">${row[10]}</td>
    <td class="data-center">${row[11]}</td>
    <td class="data-center">${row[12]}</td>
    <td class="data-center ${
      item.stock_status === "normal"
        ? "estado-normal"
        : item.stock_status === "missing"
          ? "estado-missing"
          : "estado-excess"
    }">${row[13]}</td>
    <td class="data">${row[14]}</td>
    <td class="data">${row[15]}</td>
    <td class="data">${row[16]}</td>
    <td class="data">${row[17]}</td>
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
    a.download = `inventario_maycam_${new Date().toISOString().split("T")[0]}.xls`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    // Registrar log de exportación
    logActivity("EXPORT", null, null, null, { count: filtered.length }, `Exportación de ${filtered.length} productos`)

    toast({
      title: "Exportación completada",
      description: `Se exportaron ${filtered.length} productos con todas las columnas visibles en formato Excel`,
    })
  }

  const getStats = () => {
    const totalProducts = inventory.length
    const totalBrands = brands.length
    const totalSuppliers = suppliers.length
    const uniqueSKUs = new Set(inventory.map((item) => item.sku)).size

    const totalHistoricalValue = inventory.reduce((sum, item) => sum + item.cost_without_tax * item.quantity, 0)

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    const currentMonthValue = inventory
      .filter((item) => {
        const itemDate = new Date(item.date_entered)
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
      })
      .reduce((sum, item) => sum + item.cost_without_tax * item.quantity, 0)

    return {
      totalProducts,
      totalHistoricalValue,
      currentMonthValue,
      totalBrands,
      totalSuppliers,
      uniqueSKUs,
      currentMonthExpenses,
    }
  }

  const updateCurrentMonthExpenses = (amount: number) => {
    console.log("💰 Updating current month expenses to:", amount)
    setCurrentMonthExpenses(amount)
  }

  const getSKUStats = () => {
    const skuCounts: { [key: string]: number } = {}
    const skuHistory: { [key: string]: InventoryItem[] } = {}

    inventory.forEach((item) => {
      skuCounts[item.sku] = (skuCounts[item.sku] || 0) + 1
      if (!skuHistory[item.sku]) {
        skuHistory[item.sku] = []
      }
      skuHistory[item.sku].push(item)
    })

    const duplicatedSKUs = Object.keys(skuCounts).filter((sku) => skuCounts[sku] > 1)
    const totalDuplicated = duplicatedSKUs.length

    return { skuCounts, skuHistory, duplicatedSKUs, totalDuplicated }
  }

  const getPriceVariations = () => {
    const priceVariations: { [key: string]: { percentage: number; isIncrease: boolean; hasVariation: boolean } } = {}

    const skuGroups: { [key: string]: InventoryItem[] } = {}
    inventory.forEach((item) => {
      if (!skuGroups[item.sku]) {
        skuGroups[item.sku] = []
      }
      skuGroups[item.sku].push(item)
    })

    Object.keys(skuGroups).forEach((sku) => {
      const items = skuGroups[sku].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      if (items.length > 1) {
        const oldestItem = items[0]
        const newestItem = items[items.length - 1]

        const oldPrice = oldestItem.cost_without_tax
        const newPrice = newestItem.cost_without_tax

        if (oldPrice !== newPrice && oldPrice > 0) {
          const percentage = ((newPrice - oldPrice) / oldPrice) * 100
          priceVariations[sku] = {
            percentage: Math.abs(percentage),
            isIncrease: percentage > 0,
            hasVariation: true,
          }
        } else {
          priceVariations[sku] = {
            percentage: 0,
            isIncrease: false,
            hasVariation: false,
          }
        }
      } else {
        priceVariations[sku] = {
          percentage: 0,
          isIncrease: false,
          hasVariation: false,
        }
      }
    })

    return priceVariations
  }

  const downloadTemplate = () => {
    const headers = ["SKU", "EAN", "DESCRIPCION", "CANTIDAD", "COSTO", "PVP", "FACTURA", "PROVEEDOR", "MARCA"]
    const sampleData = [
      ["PALETA22", "45435435", "PALETA FORMATO 22", "3", "100", "170", "1000-224586", "ONYX", "BULLPADEL"],
      [
        "TuboX3",
        "",
        "Tubo De Pelotas Bullpadel Tournament Pro X3",
        "10",
        "6035",
        "30990",
        "1000-224587",
        "PROVEEDOR A",
        "BULLPADEL",
      ],
      [
        "comx2-1200",
        "",
        "Combo 2 Tubos Pelotas (6) Bullpadel Tournament Pro",
        "5",
        "12070",
        "45990",
        "",
        "PROVEEDOR B",
        "BULLPADEL",
      ],
    ]

    const csvContent = [headers.join(";"), ...sampleData.map((row) => row.join(";"))].join("\n")

    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "plantilla_inventario_maycam.csv"
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast({
      title: "Plantilla descargada",
      description: "La plantilla CSV se ha descargado. Úsala como ejemplo para importar tus datos.",
    })
  }

  // Funciones de edición y eliminación para inventario
  const editInventoryItem = async (item: InventoryItem) => {
    if (!hasPermission("EDIT_ITEM")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para editar productos",
        variant: "destructive",
      })
      return
    }
    setEditingItem(item)
  }

  const updateInventoryItem = async (updatedItem: InventoryItem) => {
    if (!isSupabaseConfigured) {
      const itemIndex = inventory.findIndex((item) => item.id === updatedItem.id)
      if (itemIndex === -1) return

      const oldItem = inventory[itemIndex]
      const newInventory = [...inventory]
      newInventory[itemIndex] = updatedItem
      setInventory(newInventory)

      await logActivity(
        "EDIT_ITEM",
        "inventory",
        updatedItem.id,
        oldItem,
        updatedItem,
        `Producto ${updatedItem.sku} actualizado`,
      )

      toast({
        title: "Modo Offline - Datos temporales",
        description: "Producto actualizado solo localmente. Configure Supabase para persistir.",
        variant: "destructive",
      })
      setEditingItem(null)
      return
    }

    try {
      const { error } = await supabase
        .from("inventory")
        .update({
          sku: updatedItem.sku,
          ean: updatedItem.ean,
          description: updatedItem.description,
          cost_without_tax: updatedItem.cost_without_tax,
          cost_with_tax: updatedItem.cost_with_tax,
          pvp_without_tax: updatedItem.pvp_without_tax,
          pvp_with_tax: updatedItem.pvp_with_tax,
          quantity: updatedItem.quantity,
          company: updatedItem.company,
          channel: updatedItem.channel,
          date_entered: updatedItem.date_entered,
          stock_status: updatedItem.stock_status,
          supplier_id: updatedItem.supplier_id,
          brand_id: updatedItem.brand_id,
          invoice_number: updatedItem.invoice_number,
          observations: updatedItem.observations,
          updated_by: getCurrentUser()?.id,
        })
        .eq("id", updatedItem.id)

      if (error) throw error

      await logActivity(
        "EDIT_ITEM",
        "inventory",
        updatedItem.id,
        editingItem,
        updatedItem,
        `Producto ${updatedItem.sku} actualizado`,
      )

      toast({
        title: "Éxito",
        description: "Producto actualizado correctamente",
      })
      setEditingItem(null)
      loadData()
      setLastSync(new Date())
    } catch (error) {
      console.error("Error updating inventory item:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el producto",
        variant: "destructive",
      })
    }
  }

  const deleteInventoryItem = async (id: number) => {
    if (!hasPermission("DELETE_ITEM")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para eliminar productos",
        variant: "destructive",
      })
      return
    }

    if (!isSupabaseConfigured) {
      const itemToDelete = inventory.find((item) => item.id === id)
      if (!itemToDelete) return

      setInventory((prev) => prev.filter((item) => item.id !== id))
      await logActivity("DELETE_ITEM", "inventory", id, itemToDelete, null, `Producto ${itemToDelete.sku} eliminado`)

      toast({
        title: "Modo Offline - Datos temporales",
        description: "Producto eliminado solo localmente. Configure Supabase para persistir.",
        variant: "destructive",
      })
      setDeleteConfirm({ show: false, type: "item", id: 0, name: "" })
      return
    }

    try {
      const itemToDelete = inventory.find((item) => item.id === id)

      const { error } = await supabase.from("inventory").delete().eq("id", id)

      if (error) throw error

      await logActivity("DELETE_ITEM", "inventory", id, itemToDelete, null, `Producto ${itemToDelete?.sku} eliminado`)

      toast({
        title: "Éxito",
        description: "Producto eliminado correctamente",
      })
      setDeleteConfirm({ show: false, type: "item", id: 0, name: "" })
      loadData()
      setLastSync(new Date())
    } catch (error) {
      console.error("Error deleting inventory item:", error)
      toast({
        title: "Error",
        description: "Error al eliminar el producto",
        variant: "destructive",
      })
    }
  }

  // Funciones de edición y eliminación para proveedores
  const editSupplier = (supplier: Supplier) => {
    if (!hasPermission("EDIT_SUPPLIER")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para editar proveedores",
        variant: "destructive",
      })
      return
    }
    setEditingSupplier(supplier)
  }

  const updateSupplier = async (updatedSupplier: Supplier) => {
    if (!isSupabaseConfigured) {
      const supplierIndex = suppliers.findIndex((s) => s.id === updatedSupplier.id)
      if (supplierIndex === -1) return

      const oldSupplier = suppliers[supplierIndex]
      const newSuppliers = [...suppliers]
      newSuppliers[supplierIndex] = updatedSupplier
      setSuppliers(newSuppliers)

      await logActivity(
        "EDIT_SUPPLIER",
        "suppliers",
        updatedSupplier.id,
        oldSupplier,
        updatedSupplier,
        `Proveedor ${updatedSupplier.name} actualizado`,
      )

      toast({
        title: "Éxito (Modo Offline)",
        description: "Proveedor actualizado localmente",
      })
      setEditingSupplier(null)
      return
    }

    try {
      const { error } = await supabase
        .from("suppliers")
        .update({
          name: updatedSupplier.name,
          updated_by: getCurrentUser()?.id,
        })
        .eq("id", updatedSupplier.id)

      if (error) throw error

      await logActivity(
        "EDIT_SUPPLIER",
        "suppliers",
        updatedSupplier.id,
        editingSupplier,
        updatedSupplier,
        `Proveedor ${updatedSupplier.name} actualizado`,
      )

      toast({
        title: "Éxito",
        description: "Proveedor actualizado correctamente",
      })
      setEditingSupplier(null)
      loadData()
      setLastSync(new Date())
    } catch (error) {
      console.error("Error updating supplier:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el proveedor",
        variant: "destructive",
      })
    }
  }

  const deleteSupplier = async (id: number) => {
    if (!hasPermission("DELETE_SUPPLIER")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para eliminar proveedores",
        variant: "destructive",
      })
      return
    }

    if (!isSupabaseConfigured) {
      const supplierToDelete = suppliers.find((s) => s.id === id)
      if (!supplierToDelete) return

      setSuppliers((prev) => prev.filter((s) => s.id !== id))
      await logActivity(
        "DELETE_SUPPLIER",
        "suppliers",
        id,
        supplierToDelete,
        null,
        `Proveedor ${supplierToDelete.name} eliminado`,
      )

      toast({
        title: "Éxito (Modo Offline)",
        description: "Proveedor eliminado localmente",
      })
      setDeleteConfirm({ show: false, type: "supplier", id: 0, name: "" })
      return
    }

    try {
      const supplierToDelete = suppliers.find((s) => s.id === id)

      const { error } = await supabase.from("suppliers").delete().eq("id", id)

      if (error) throw error

      await logActivity(
        "DELETE_SUPPLIER",
        "suppliers",
        id,
        supplierToDelete,
        null,
        `Proveedor ${supplierToDelete?.name} eliminado`,
      )

      toast({
        title: "Éxito",
        description: "Proveedor eliminado correctamente",
      })
      setDeleteConfirm({ show: false, type: "supplier", id: 0, name: "" })
      loadData()
      setLastSync(new Date())
    } catch (error) {
      console.error("Error deleting supplier:", error)
      toast({
        title: "Error",
        description: "Error al eliminar el proveedor",
        variant: "destructive",
      })
    }
  }

  // Funciones de edición y eliminación para marcas
  const editBrand = (brand: Brand) => {
    if (!hasPermission("EDIT_BRAND")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para editar marcas",
        variant: "destructive",
      })
      return
    }
    setEditingBrand(brand)
  }

  const updateBrand = async (updatedBrand: Brand) => {
    if (!isSupabaseConfigured) {
      const brandIndex = brands.findIndex((b) => b.id === updatedBrand.id)
      if (brandIndex === -1) return

      const oldBrand = brands[brandIndex]
      const newBrands = [...brands]
      newBrands[brandIndex] = updatedBrand
      setBrands(newBrands)

      await logActivity(
        "EDIT_BRAND",
        "brands",
        updatedBrand.id,
        oldBrand,
        updatedBrand,
        `Marca ${updatedBrand.name} actualizada`,
      )

      toast({
        title: "Éxito (Modo Offline)",
        description: "Marca actualizada localmente",
      })
      setEditingBrand(null)
      return
    }

    try {
      const { error } = await supabase
        .from("brands")
        .update({
          name: updatedBrand.name,
          updated_by: getCurrentUser()?.id,
        })
        .eq("id", updatedBrand.id)

      if (error) throw error

      await logActivity(
        "EDIT_BRAND",
        "brands",
        updatedBrand.id,
        editingBrand,
        updatedBrand,
        `Marca ${updatedBrand.name} actualizada`,
      )

      toast({
        title: "Éxito",
        description: "Marca actualizada correctamente",
      })
      setEditingBrand(null)
      loadData()
      setLastSync(new Date())
    } catch (error) {
      console.error("Error updating brand:", error)
      toast({
        title: "Error",
        description: "Error al actualizar la marca",
        variant: "destructive",
      })
    }
  }

  const deleteBrand = async (id: number) => {
    if (!hasPermission("DELETE_BRAND")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para eliminar marcas",
        variant: "destructive",
      })
      return
    }

    if (!isSupabaseConfigured) {
      const brandToDelete = brands.find((b) => b.id === id)
      if (!brandToDelete) return

      setBrands((prev) => prev.filter((b) => b.id !== id))
      await logActivity("DELETE_BRAND", "brands", id, brandToDelete, null, `Marca ${brandToDelete.name} eliminada`)

      toast({
        title: "Éxito (Modo Offline)",
        description: "Marca eliminada localmente",
      })
      setDeleteConfirm({ show: false, type: "brand", id: 0, name: "" })
      return
    }

    try {
      const brandToDelete = brands.find((b) => b.id === id)

      const { error } = await supabase.from("brands").delete().eq("id", id)

      if (error) throw error

      await logActivity("DELETE_BRAND", "brands", id, brandToDelete, null, `Marca ${brandToDelete?.name} eliminada`)

      toast({
        title: "Éxito",
        description: "Marca eliminada correctamente",
      })
      setDeleteConfirm({ show: false, type: "brand", id: 0, name: "" })
      loadData()
      setLastSync(new Date())
    } catch (error) {
      console.error("Error deleting brand:", error)
      toast({
        title: "Error",
        description: "Error al eliminar la marca",
        variant: "destructive",
      })
    }
  }

  const stats = getStats()
  const skuStats = getSKUStats()
  const priceVariations = getPriceVariations()

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Mostrar pantalla de login si no está autenticado
  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Zócalo de Anuncios - Solo visible si hay anuncios */}
      {announcement && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-200" />
                <span className="font-medium">{announcement}</span>
              </div>
              {getCurrentUser()?.role === "admin" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAnnouncement("")}
                  className="text-white hover:bg-white/20 h-8 px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="container mx-auto p-6 space-y-6">
        {/* Header con información del usuario */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Sistema MAYCAM
            </h1>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className={`text-sm ${isOnline ? "text-green-600" : "text-red-600"}`}>
                {isOnline ? "En línea" : "Sin conexión"}
              </span>
              {lastSync && <span className="text-xs text-slate-500">Última sync: {lastSync.toLocaleTimeString()}</span>}
            </div>
            <p className="text-slate-600 mt-2">Gestión Integral de Inventario</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline" className="shadow-sm bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
            <UserHeader
              onLogout={handleLogout}
              onShowLogs={() => setShowLogs(true)}
              onShowUsers={() => setShowUsers(true)}
              onShowWholesale={() => setShowWholesale(true)}
            />
          </div>
        </div>

        {/* Stats Cards - Ahora con 8 elementos en una línea */}
        <div className="grid grid-cols-8 gap-3">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs">Compras Mes</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.currentMonthValue)}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs">Total Histórico</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalHistoricalValue)}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-xs">SKUs Únicos</p>
                  <p className="text-lg font-bold">{stats.uniqueSKUs}</p>
                </div>
                <Package className="w-5 h-5 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs">Marcas</p>
                  <p className="text-lg font-bold">{stats.totalBrands}</p>
                </div>
                <Tag className="w-5 h-5 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs">Proveedores</p>
                  <p className="text-lg font-bold">{stats.totalSuppliers}</p>
                </div>
                <Users className="w-5 h-5 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          {/* Nuevo zócalo turquesa clickeable para GASTOS */}
          <Card
            className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg cursor-pointer hover:from-teal-600 hover:to-cyan-700 transition-all transform hover:scale-105"
            onClick={() => setShowGastos(true)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-xs">Gastos</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.currentMonthExpenses)}</p>
                </div>
                <Receipt className="w-5 h-5 text-teal-200" />
              </div>
            </CardContent>
          </Card>

          {/* Zócalo amarillo para Precios a Publicar */}
          <Card
            className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg cursor-pointer hover:from-yellow-600 hover:to-amber-700 transition-all transform hover:scale-105"
            onClick={() => setActiveTab("precios")}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-xs">Precios a</p>
                  <p className="text-lg font-bold">Publicar</p>
                </div>
                <DollarSign className="w-5 h-5 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          {/* Zócalo gris oscuro para ZENTOR */}
          <Card
            className="bg-gradient-to-r from-gray-700 to-slate-800 text-white shadow-lg cursor-pointer hover:from-gray-800 hover:to-slate-900 transition-all transform hover:scale-105"
            onClick={() => setActiveTab("zentor")}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-xs">Lista</p>
                  <p className="text-lg font-bold">ZENTOR</p>
                </div>
                <Package className="w-5 h-5 text-gray-300" />
              </div>
            </CardContent>
          </Card>

          {/* Zócalo morado para Ventas Mayoristas */}
          <Card
            className="bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg cursor-pointer hover:from-purple-600 hover:to-violet-700 transition-all transform hover:scale-105"
            onClick={() => setShowWholesale(true)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs">Ventas</p>
                  <p className="text-lg font-bold">Mayoristas</p>
                </div>
                <ShoppingCart className="w-5 h-5 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botón para gestionar anuncios - Solo administradores */}
        {getCurrentUser()?.role === "admin" && (
          <div className="flex justify-end">
            <Button
              onClick={() => setShowAnnouncementForm(true)}
              variant="outline"
              className="shadow-sm bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Gestionar Anuncio
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-white shadow-sm">
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Inventario
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Importar
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Proveedores
            </TabsTrigger>
            <TabsTrigger value="brands" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Marcas
            </TabsTrigger>
            {hasPermission("EDIT_CONFIG") && (
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuración
              </TabsTrigger>
            )}
            <TabsTrigger value="zentor" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              ZENTOR
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            {/* Form */}
            {hasPermission("CREATE_ITEM") && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Plus className="w-5 h-5" />
                    Agregar Mercadería
                  </CardTitle>
                  <CardDescription>
                    Complete todos los campos para agregar un nuevo producto al inventario
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="sku" className="text-slate-700 font-medium">
                        SKU *
                      </Label>
                      <div className="relative">
                        <Input
                          id="sku"
                          value={formData.sku}
                          onChange={(e) => handleInputChange("sku", e.target.value)}
                          placeholder="Código SKU"
                          className={`mt-1 ${
                            formData.sku &&
                            inventory.find((item) => item.sku.toLowerCase() === formData.sku.toLowerCase())
                              ? "border-orange-300 bg-orange-50"
                              : ""
                          }`}
                        />
                        {formData.sku &&
                          inventory.find((item) => item.sku.toLowerCase() === formData.sku.toLowerCase()) && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                Existente
                              </Badge>
                            </div>
                          )}
                      </div>
                      {formData.sku &&
                        inventory.find((item) => item.sku.toLowerCase() === formData.sku.toLowerCase()) && (
                          <p className="text-sm text-orange-600 mt-1">
                            ⚠️ Este SKU ya existe. Descripción autocompletada.
                          </p>
                        )}
                    </div>
                    <div>
                      <Label htmlFor="ean" className="text-slate-700 font-medium">
                        EAN
                      </Label>
                      <Input
                        id="ean"
                        value={formData.ean}
                        onChange={(e) => handleInputChange("ean", e.target.value)}
                        placeholder="Código EAN"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description" className="text-slate-700 font-medium">
                        Descripción *
                      </Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="Descripción del producto"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="cost_without_tax" className="text-slate-700 font-medium">
                        Costo s/IVA *
                      </Label>
                      <Input
                        id="cost_without_tax"
                        type="number"
                        step="0.01"
                        value={formData.cost_without_tax}
                        onChange={(e) => handleInputChange("cost_without_tax", e.target.value)}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cost_with_tax" className="text-slate-700 font-medium">
                        Costo c/IVA ({ivaPercentage}%)
                      </Label>
                      <Input
                        id="cost_with_tax"
                        type="number"
                        step="0.01"
                        value={
                          formData.cost_without_tax
                            ? calculateWithTax(Number.parseFloat(formData.cost_without_tax)).toFixed(2)
                            : ""
                        }
                        disabled
                        className="bg-gradient-to-r from-slate-50 to-slate-100 mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pvp_without_tax" className="text-slate-700 font-medium">
                        PVP s/IVA *
                      </Label>
                      <Input
                        id="pvp_without_tax"
                        type="number"
                        step="0.01"
                        value={formData.pvp_without_tax}
                        onChange={(e) => handleInputChange("pvp_without_tax", e.target.value)}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pvp_with_tax" className="text-slate-700 font-medium">
                        PVP c/IVA ({ivaPercentage}%)
                      </Label>
                      <Input
                        id="pvp_with_tax"
                        type="number"
                        step="0.01"
                        value={
                          formData.pvp_without_tax
                            ? calculateWithTax(Number.parseFloat(formData.pvp_without_tax)).toFixed(2)
                            : ""
                        }
                        disabled
                        className="bg-gradient-to-r from-slate-50 to-slate-100 mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="quantity" className="text-slate-700 font-medium">
                        Cantidad *
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => handleInputChange("quantity", e.target.value)}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company" className="text-slate-700 font-medium">
                        Empresa *
                      </Label>
                      <Select
                        value={formData.company || ""}
                        onValueChange={(value) => handleInputChange("company", value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Seleccionar empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MAYCAM">MAYCAM</SelectItem>
                          <SelectItem value="BLUE DOGO">BLUE DOGO</SelectItem>
                          <SelectItem value="GLOBOBAZAAR">GLOBOBAZAAR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="channel" className="text-slate-700 font-medium">
                        Canal *
                      </Label>
                      <Select
                        value={formData.channel || ""}
                        onValueChange={(value) => handleInputChange("channel", value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Seleccionar canal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Canal A</SelectItem>
                          <SelectItem value="B">Canal B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="date_entered" className="text-slate-700 font-medium">
                        Fecha *
                      </Label>
                      <Input
                        id="date_entered"
                        type="date"
                        value={formData.date_entered}
                        onChange={(e) => handleInputChange("date_entered", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="stock_status" className="text-slate-700 font-medium">
                        Estado Stock
                      </Label>
                      <Select
                        value={formData.stock_status}
                        onValueChange={(value) => handleInputChange("stock_status", value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={formData.stock_status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="missing">Faltó mercadería</SelectItem>
                          <SelectItem value="excess">Sobró mercadería</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="supplier_id" className="text-slate-700 font-medium">
                        Proveedor
                      </Label>
                      <Select
                        value={formData.supplier_id || "none"}
                        onValueChange={(value) => handleInputChange("supplier_id", value === "none" ? "" : value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin proveedor</SelectItem>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id.toString()}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="brand_id" className="text-slate-700 font-medium">
                        Marca
                      </Label>
                      <Select
                        value={formData.brand_id || "none"}
                        onValueChange={(value) => handleInputChange("brand_id", value === "none" ? "" : value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Seleccionar marca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin marca</SelectItem>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id.toString()}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="invoice_number" className="text-slate-700 font-medium">
                        Nº Factura
                      </Label>
                      <Input
                        id="invoice_number"
                        value={formData.invoice_number}
                        onChange={(e) => handleInputChange("invoice_number", e.target.value)}
                        placeholder="Número de factura"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observations" className="text-slate-700 font-medium">
                      Observaciones (Opcional)
                    </Label>
                    <Textarea
                      id="observations"
                      value={formData.observations}
                      onChange={(e) => handleInputChange("observations", e.target.value)}
                      placeholder="Observaciones adicionales..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={addInventoryItem}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                    disabled={
                      !formData.sku?.trim() ||
                      !formData.description?.trim() ||
                      !formData.cost_without_tax ||
                      !formData.pvp_without_tax ||
                      !formData.quantity ||
                      !formData.company ||
                      !formData.channel
                    }
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Producto
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Filter className="w-5 h-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
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
                  <div>
                    <Label htmlFor="dateFrom" className="text-slate-700 font-medium">
                      Fecha desde
                    </Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo" className="text-slate-700 font-medium">
                      Fecha hasta
                    </Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filterSupplier" className="text-slate-700 font-medium">
                      Proveedor
                    </Label>
                    <Select
                      value={filters.supplier || "all"}
                      onChange={(value) => setFilters((prev) => ({ ...prev, supplier: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="filterBrand" className="text-slate-700 font-medium">
                      Marca
                    </Label>
                    <Select
                      value={filters.brand || "all"}
                      onChange={(value) => setFilters((prev) => ({ ...prev, brand: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id.toString()}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="filterCompany" className="text-slate-700 font-medium">
                      Empresa
                    </Label>
                    <Select
                      value={filters.company}
                      onChange={(value) => setFilters((prev) => ({ ...prev, company: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="MAYCAM">MAYCAM</SelectItem>
                        <SelectItem value="BLUE DOGO">BLUE DOGO</SelectItem>
                        <SelectItem value="GLOBOBAZAAR">GLOBOBAZAAR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="filterDuplicates" className="text-slate-700 font-medium">
                      SKUs Duplicados
                    </Label>
                    <Select
                      value={filters.duplicates || "all"}
                      onChange={(value) => setFilters((prev) => ({ ...prev, duplicates: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="duplicated">Solo Duplicados</SelectItem>
                        <SelectItem value="unique">Solo Únicos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sortBy" className="text-slate-700 font-medium">
                      Ordenar por
                    </Label>
                    <Select
                      value={filters.sortBy}
                      onChange={(value) => setFilters((prev) => ({ ...prev, sortBy: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={filters.sortBy} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date_desc">Fecha (más reciente)</SelectItem>
                        <SelectItem value="date_asc">Fecha (más antigua)</SelectItem>
                        <SelectItem value="price_asc">Precio (menor a mayor)</SelectItem>
                        <SelectItem value="price_desc">Precio (mayor a menor)</SelectItem>
                        <SelectItem value="sku_duplicates">SKUs más repetidos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilters({
                        dateFrom: "",
                        dateTo: "",
                        supplier: "all",
                        brand: "all",
                        company: "all",
                        duplicates: "all",
                        sortBy: "date_desc",
                        searchSku: "",
                      })
                    }
                    className="shadow-sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpiar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Table */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 border-b border-blue-100">
                <CardTitle className="flex items-center gap-3 text-slate-800">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-blue-100">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent font-bold text-xl">
                      Lista de Inventario
                    </span>
                    <Badge variant="outline" className="ml-3 bg-blue-50 text-blue-700 border-blue-200">
                      {getFilteredInventory().length} productos
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[65vh] relative">
                  <Table>
                    <TableHeader>
<<<<<<< HEAD
                      <TableRow className="bg-gradient-to-r from-blue-500 to-blue-600">
                        <TableHead className="font-bold text-white text-center border border-slate-300">SKU</TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Repeticiones
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">EAN</TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Descripción
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Costo s/IVA
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Costo c/IVA
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          PVP s/IVA
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          PVP c/IVA
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Variación Precio
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Cantidad
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Empresa
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Canal
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Fecha
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Estado
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Proveedor
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Marca
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Nº Factura
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
                          Observaciones
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border border-slate-300">
=======
                      <TableRow className="bg-gradient-to-r from-blue-600 to-indigo-700 border-b border-blue-800 sticky top-0 z-20 shadow-md">
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">SKU</TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Rep.
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">EAN</TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Descripción
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Costo s/IVA
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Costo c/IVA
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          PVP s/IVA
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          PVP c/IVA
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Var.
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Cant.
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Empresa
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Canal
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Fecha
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Estado
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Prov.
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Marca
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Factura
                        </TableHead>
                        <TableHead className="font-bold text-white text-center border-r border-blue-400/30 text-xs px-2 h-8">
                          Obs.
                        </TableHead>
                        <TableHead className="font-bold text-white text-center text-xs px-2 h-8">
>>>>>>> cfdb2897791e6610d2eeb399f41ec26d521ad4d0
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
<<<<<<< HEAD
                      {getFilteredInventory().map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium border border-slate-200 min-w-[150px] max-w-[200px]">
=======
                      {getFilteredInventory().length > 0 ? (
                        getFilteredInventory().map((item) => (
                          <TableRow key={item.id} className="hover:bg-blue-100/40 transition-colors border-b border-slate-100 group h-8 even:bg-blue-50/10">
                          <TableCell className="font-medium min-w-[100px] max-w-[150px] border-r border-slate-100 py-1 px-2 text-xs">
>>>>>>> cfdb2897791e6610d2eeb399f41ec26d521ad4d0
                            <div
                              className="font-mono whitespace-nowrap overflow-hidden text-ellipsis text-blue-600 font-semibold"
                              style={{
                                fontVariantNumeric: "tabular-nums",
                                wordBreak: "keep-all",
                              }}
                              title={String(item.sku)}
                            >
                              {String(item.sku)}
                            </div>
                          </TableCell>
                          <TableCell className="border-r border-slate-100 py-1 px-2 text-xs">
                            <div className="flex items-center gap-1 justify-center">
                              <span className="font-medium text-slate-600">{skuStats.skuCounts[item.sku]}x</span>
                              {skuStats.skuCounts[item.sku] > 1 && (
                                <Badge
                                  variant="destructive"
                                  className="cursor-pointer hover:bg-red-600 shadow-sm h-5 px-1 text-[10px]"
                                  onClick={() =>
                                    setSKUHistoryModal({
                                      show: true,
                                      sku: item.sku,
                                      history: skuStats.skuHistory[item.sku],
                                    })
                                  }
                                >
                                  Ver
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="border-r border-slate-100 py-1 px-2 text-center text-xs">{item.ean}</TableCell>
                          <TableCell className="border-r border-slate-100 py-1 px-2 text-xs max-w-[150px] truncate" title={item.description}>{item.description}</TableCell>
                          <TableCell className="border-r border-slate-100 text-right font-mono text-slate-600 py-1 px-2 text-xs">${item.cost_without_tax.toFixed(2)}</TableCell>
                          <TableCell className="border-r border-slate-100 text-right font-mono text-slate-600 py-1 px-2 text-xs">${item.cost_with_tax.toFixed(2)}</TableCell>
                          <TableCell className="border-r border-slate-100 text-right font-mono font-medium text-slate-800 py-1 px-2 text-xs">${item.pvp_without_tax.toFixed(2)}</TableCell>
                          <TableCell className="border-r border-slate-100 text-right font-mono font-bold text-slate-900 py-1 px-2 text-xs">${item.pvp_with_tax.toFixed(2)}</TableCell>
                          <TableCell className="border-r border-slate-100 py-1 px-2 text-xs">
                            {priceVariations[item.sku]?.hasVariation ? (
                              <div className="flex items-center justify-center gap-1">
                                {priceVariations[item.sku].isIncrease ? (
                                  <TrendingUp className="w-3 h-3 text-red-500" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 text-green-500" />
                                )}
                                <span
                                  className={`text-[10px] font-medium ${
                                    priceVariations[item.sku].isIncrease ? "text-red-600" : "text-green-600"
                                  }`}
                                >
                                  {priceVariations[item.sku].percentage.toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <Minus className="w-3 h-3 text-slate-300" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="border-r border-slate-100 text-center font-medium py-1 px-2 text-xs">{item.quantity}</TableCell>
                          <TableCell className="border-r border-slate-100 text-center py-1 px-2 text-xs">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 h-5 px-1 text-[10px]">
                              {item.company.substring(0, 3)}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-r border-slate-100 text-center py-1 px-2 text-xs">{item.channel}</TableCell>
                          <TableCell className="border-r border-slate-100 text-center text-slate-500 py-1 px-2 text-[10px] whitespace-nowrap">{item.date_entered}</TableCell>
                          <TableCell className="border-r border-slate-100 text-center py-1 px-2">
                            <Badge
                              variant={
                                item.stock_status === "normal"
                                  ? "default"
                                  : item.stock_status === "missing"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className={`h-5 px-1 text-[10px] ${
                                item.stock_status === "normal"
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"
                                  : ""
                              }`}
                            >
                              {item.stock_status === "normal"
                                ? "Ok"
                                : item.stock_status === "missing"
                                  ? "Faltó"
                                  : "Sobró"}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-r border-slate-100 py-1 px-2 text-xs truncate max-w-[80px]" title={item.suppliers?.name}>{item.suppliers?.name}</TableCell>
                          <TableCell className="border-r border-slate-100 py-1 px-2 text-xs truncate max-w-[80px]" title={item.brands?.name}>{item.brands?.name}</TableCell>
                          <TableCell className="border-r border-slate-100 font-mono text-[10px] py-1 px-2 truncate max-w-[80px]" title={item.invoice_number}>{item.invoice_number}</TableCell>
                          <TableCell className="max-w-[100px] truncate border-r border-slate-100 text-slate-500 italic py-1 px-2 text-[10px]" title={item.observations}>
                            {item.observations}
                          </TableCell>
                          <TableCell className="py-1 px-2">
                            <div className="flex gap-1 justify-center">
                              {hasPermission("EDIT_ITEM") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => editInventoryItem(item)}
                                  className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                              {hasPermission("DELETE_ITEM") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setDeleteConfirm({
                                      show: true,
                                      type: "item",
                                      id: item.id,
                                      name: item.sku,
                                    })
                                  }
                                  className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={19} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-500">
                              <Package className="w-12 h-12 mb-3 text-slate-300" />
                              <p className="text-lg font-medium text-slate-600">No se encontraron productos</p>
                              <p className="text-sm text-slate-400">Intenta ajustar los filtros de búsqueda</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            {hasPermission("IMPORT") ? (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-emerald-800">
                    <FileSpreadsheet className="w-5 h-5" />
                    Importar desde Excel
                  </CardTitle>
                  <CardDescription>
                    Importe productos desde un archivo CSV. Descarga la plantilla para ver el formato exacto requerido.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="border-2 border-dashed border-emerald-200 rounded-lg p-8 text-center bg-gradient-to-br from-emerald-50 to-green-50 hover:border-emerald-300 transition-colors">
                    <FileSpreadsheet className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-emerald-800 mb-2">Seleccionar archivo CSV</h3>
                    <p className="text-emerald-600 mb-4">Formatos soportados: .csv (recomendado), .xls, .xlsx</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button
                      onClick={() => {
                        fileInputRef.current?.click()
                      }}
                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg transform hover:scale-105 transition-all"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Seleccionar Archivo
                    </Button>
                    <p className="text-xs text-emerald-500 mt-2">Haz clic para seleccionar tu archivo CSV</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">Formato EXACTO requerido del CSV:</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="bg-yellow-100 p-2 rounded border border-yellow-300">
                        <strong>A: SKU</strong> (Obligatorio)
                      </div>
                      <div className="bg-green-100 p-2 rounded border border-green-300">
                        <strong>B: EAN</strong> (Opcional)
                      </div>
                      <div className="bg-yellow-100 p-2 rounded border border-yellow-300">
                        <strong>C: DESCRIPCION</strong> (Obligatorio)
                      </div>
                      <div className="bg-green-100 p-2 rounded border border-green-300">
                        <strong>D: CANTIDAD</strong> (Opcional, default 0)
                      </div>
                      <div className="bg-yellow-100 p-2 rounded border border-yellow-300">
                        <strong>E: COSTO</strong> (Obligatorio)
                      </div>
                      <div className="bg-yellow-100 p-2 rounded border border-yellow-300">
                        <strong>F: PVP</strong> (Obligatorio)
                      </div>
                      <div className="bg-green-100 p-2 rounded border border-green-300">
                        <strong>G: FACTURA</strong> (Opcional)
                      </div>
                      <div className="bg-green-100 p-2 rounded border border-green-300">
                        <strong>H: PROVEEDOR</strong> (Opcional)
                      </div>
                      <div className="bg-yellow-100 p-2 rounded border border-yellow-300">
                        <strong>I: MARCA</strong> (Obligatorio)
                      </div>
                    </div>
                    <p className="text-blue-600 mt-4">
                      <strong>Ejemplo:</strong> PALETA22;45435435;PALETA FORMATO 22;3;100;170;1000-224586;ONYX;BULLPADEL
                    </p>
                  </div>

                  <Button variant="link" onClick={downloadTemplate} className="shadow-sm">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Plantilla CSV de Ejemplo
                  </Button>

                  {importProgress.show && (
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold text-emerald-700">Importando...</h4>
                      <Progress value={(importProgress.current / importProgress.total) * 100} />
                      <p className="text-sm text-emerald-500">
                        {importProgress.current} de {importProgress.total} filas procesadas
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Sin permisos</h3>
                  <p className="text-slate-600">No tiene permisos para importar datos.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="suppliers">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <Building2 className="w-5 h-5" />
                  Proveedores
                </CardTitle>
                <CardDescription>Administre sus proveedores</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {hasPermission("CREATE_SUPPLIER") && (
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      placeholder="Nuevo proveedor"
                      value={newSupplier}
                      onChange={(e) => setNewSupplier(e.target.value)}
                    />
                    <Button onClick={addSupplier} className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm">
                      Agregar
                    </Button>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold">Nombre</TableHead>
                      <TableHead className="font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          {editingSupplier?.id === supplier.id ? (
                            <Input
                              value={editingSupplier.name}
                              onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                              className="w-full"
                            />
                          ) : (
                            supplier.name
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingSupplier?.id === supplier.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateSupplier(editingSupplier)}
                                  className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Guardar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingSupplier(null)}
                                  className="h-8 px-3 text-xs text-gray-600 hover:bg-gray-100"
                                >
                                  Cancelar
                                </Button>
                              </>
                            ) : (
                              <>
                                {hasPermission("EDIT_SUPPLIER") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editSupplier(supplier)}
                                    className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                )}
                                {hasPermission("DELETE_SUPPLIER") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setDeleteConfirm({
                                        show: true,
                                        type: "supplier",
                                        id: supplier.id,
                                        name: supplier.name,
                                      })
                                    }
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brands">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Tag className="w-5 h-5" />
                  Marcas
                </CardTitle>
                <CardDescription>Administre las marcas de sus productos</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {hasPermission("CREATE_BRAND") && (
                  <div className="flex items-center gap-4">
                    <Input
                      type="text"
                      placeholder="Nueva marca"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                    />
                    <Button onClick={addBrand} className="bg-purple-500 hover:bg-purple-600 text-white shadow-sm">
                      Agregar
                    </Button>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold">Nombre</TableHead>
                      <TableHead className="font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brands.map((brand) => (
                      <TableRow key={brand.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          {editingBrand?.id === brand.id ? (
                            <Input
                              value={editingBrand.name}
                              onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
                              className="w-full"
                            />
                          ) : (
                            brand.name
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingBrand?.id === brand.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateBrand(editingBrand)}
                                  className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Guardar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingBrand(null)}
                                  className="h-8 px-3 text-xs text-gray-600 hover:bg-gray-100"
                                >
                                  Cancelar
                                </Button>
                              </>
                            ) : (
                              <>
                                {hasPermission("EDIT_BRAND") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editBrand(brand)}
                                    className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                )}
                                {hasPermission("DELETE_BRAND") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setDeleteConfirm({
                                        show: true,
                                        type: "brand",
                                        id: brand.id,
                                        name: brand.name,
                                      })
                                    }
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-zinc-50 to-stone-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-stone-800">
                  <Settings className="w-5 h-5" />
                  Configuración General
                </CardTitle>
                <CardDescription>Ajustes generales del sistema</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {hasPermission("EDIT_CONFIG") ? (
                  <div>
                    <Label htmlFor="ivaPercentage" className="text-slate-700 font-medium">
                      Porcentaje de IVA
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="ivaPercentage"
                        type="number"
                        value={ivaPercentage}
                        onChange={(e) => updateIvaPercentage(Number(e.target.value))}
                        className="w-24 mt-1"
                      />
                      <span className="text-slate-700">%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Sin permisos</h3>
                    <p className="text-slate-600">No tiene permisos para modificar la configuración.</p>
                    <p className="text-slate-500 mt-2">IVA actual: {ivaPercentage}%</p>
                  </div>
                )}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800">Configuración de Cuotas</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="cuotas3" className="text-slate-700 font-medium">
                        3 Cuotas (%)
                      </Label>
                      <Input
                        id="cuotas3"
                        type="number"
                        value={cuotasConfig.cuotas_3_percentage}
                        onChange={(e) =>
                          setCuotasConfig((prev) => ({ ...prev, cuotas_3_percentage: Number(e.target.value) }))
                        }
                        className="mt-1"
                        disabled={!hasPermission("EDIT_CONFIG")}
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
                        onChange={(e) =>
                          setCuotasConfig((prev) => ({ ...prev, cuotas_6_percentage: Number(e.target.value) }))
                        }
                        className="mt-1"
                        disabled={!hasPermission("EDIT_CONFIG")}
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
                        onChange={(e) =>
                          setCuotasConfig((prev) => ({ ...prev, cuotas_9_percentage: Number(e.target.value) }))
                        }
                        className="mt-1"
                        disabled={!hasPermission("EDIT_CONFIG")}
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
                        onChange={(e) =>
                          setCuotasConfig((prev) => ({ ...prev, cuotas_12_percentage: Number(e.target.value) }))
                        }
                        className="mt-1"
                        disabled={!hasPermission("EDIT_CONFIG")}
                      />
                    </div>
                  </div>
                  {hasPermission("EDIT_CONFIG") && (
                    <Button
                      onClick={() => updateCuotasPercentages(cuotasConfig)}
                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                    >
                      Guardar Configuración de Cuotas
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="precios">
            <PreciosPublicar
              inventory={inventory}
              suppliers={suppliers}
              brands={brands}
              cuotasConfig={cuotasConfig}
              onUpdateCuotasConfig={updateCuotasPercentages}
            />
          </TabsContent>
          <TabsContent value="zentor">
            <ZentorList inventory={inventory} suppliers={suppliers} brands={brands} />
          </TabsContent>
        </Tabs>

        {/* Modales para Logs, Usuarios y Gastos */}
        <ActivityLogs isOpen={showLogs} onClose={() => setShowLogs(false)} />
        <UserManagement isOpen={showUsers} onClose={() => setShowUsers(false)} />
        <GastosManagement
          isOpen={showGastos}
          onClose={() => setShowGastos(false)}
          onUpdateExpenses={updateCurrentMonthExpenses}
        />
        {hasPermission("VIEW_WHOLESALE") && (
          <MayoristasManagement
            isOpen={showWholesale}
            onClose={() => setShowWholesale(false)}
            inventory={inventory}
            suppliers={suppliers}
            brands={brands}
          />
        )}

        {/* Modal de confirmación de eliminación */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold mb-4 text-red-600">Confirmar Eliminación</h2>
              <p className="text-gray-700 mb-6">
                ¿Está seguro de que desea eliminar{" "}
                {deleteConfirm.type === "item"
                  ? `el producto "${deleteConfirm.name}"`
                  : deleteConfirm.type === "supplier"
                    ? `el proveedor "${deleteConfirm.name}"`
                    : `la marca "${deleteConfirm.name}"`}
                ?
              </p>
              <p className="text-sm text-red-500 mb-4">Esta acción no se puede deshacer.</p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm({ show: false, type: "item", id: 0, name: "" })}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deleteConfirm.type === "item") {
                      deleteInventoryItem(deleteConfirm.id)
                    } else if (deleteConfirm.type === "supplier") {
                      deleteSupplier(deleteConfirm.id)
                    } else if (deleteConfirm.type === "brand") {
                      deleteBrand(deleteConfirm.id)
                    }
                  }}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de edición de producto */}
        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4 text-blue-600">Editar Producto</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-sku">SKU</Label>
                  <Input
                    id="edit-sku"
                    value={editingItem.sku}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-ean">EAN</Label>
                  <Input
                    id="edit-ean"
                    value={editingItem.ean || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, ean: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Input
                    id="edit-description"
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-cost">Costo s/IVA</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    step="0.01"
                    value={editingItem.cost_without_tax}
                    onChange={(e) => {
                      const cost = Number.parseFloat(e.target.value)
                      setEditingItem({
                        ...editingItem,
                        cost_without_tax: cost,
                        cost_with_tax: calculateWithTax(cost),
                      })
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-pvp">PVP s/IVA</Label>
                  <Input
                    id="edit-pvp"
                    type="number"
                    step="0.01"
                    value={editingItem.pvp_without_tax}
                    onChange={(e) => {
                      const pvp = Number.parseFloat(e.target.value)
                      setEditingItem({
                        ...editingItem,
                        pvp_without_tax: pvp,
                        pvp_with_tax: calculateWithTax(pvp),
                      })
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-quantity">Cantidad</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: Number.parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-company">Empresa</Label>
                  <Select
                    value={editingItem.company}
                    onValueChange={(value: "MAYCAM" | "BLUE DOGO" | "GLOBOBAZAAR") =>
                      setEditingItem({ ...editingItem, company: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue value={editingItem.company} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAYCAM">MAYCAM</SelectItem>
                      <SelectItem value="BLUE DOGO">BLUE DOGO</SelectItem>
                      <SelectItem value="GLOBOBAZAAR">GLOBOBAZAAR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-channel">Canal</Label>
                  <Select
                    value={editingItem.channel}
                    onValueChange={(value: "A" | "B") => setEditingItem({ ...editingItem, channel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue value={editingItem.channel} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Canal A</SelectItem>
                      <SelectItem value="B">Canal B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-supplier">Proveedor</Label>
                  <Select
                    value={editingItem.supplier_id?.toString() || "none"}
                    onValueChange={(value) =>
                      setEditingItem({ ...editingItem, supplier_id: value === "none" ? null : Number.parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proveedor</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-brand">Marca</Label>
                  <Select
                    value={editingItem.brand_id?.toString() || "none"}
                    onValueChange={(value) =>
                      setEditingItem({ ...editingItem, brand_id: value === "none" ? null : Number.parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin marca</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-invoice">Nº Factura</Label>
                  <Input
                    id="edit-invoice"
                    value={editingItem.invoice_number || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, invoice_number: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3">
                  <Label htmlFor="edit-observations">Observaciones</Label>
                  <Textarea
                    id="edit-observations"
                    value={editingItem.observations || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, observations: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="secondary" onClick={() => setEditingItem(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => updateInventoryItem(editingItem)}>Guardar Cambios</Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para gestionar anuncios */}
        {showAnnouncementForm && getCurrentUser()?.role === "admin" && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold mb-4 text-amber-700">Gestionar Anuncio del Sistema</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="announcement-text" className="text-slate-700 font-medium">
                    Mensaje del Anuncio
                  </Label>
                  <Textarea
                    id="announcement-text"
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    placeholder="Escriba el mensaje que desea mostrar a todos los usuarios..."
                    rows={3}
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Deje vacío para ocultar el anuncio. Solo los administradores pueden ver y editar este mensaje.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="secondary" onClick={() => setShowAnnouncementForm(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    await logActivity(
                      "UPDATE_ANNOUNCEMENT",
                      null,
                      null,
                      null,
                      { announcement },
                      `Anuncio del sistema ${announcement ? "actualizado" : "eliminado"}: ${announcement || "Sin mensaje"}`,
                    )
                    setShowAnnouncementForm(false)
                    toast({
                      title: "Anuncio actualizado",
                      description: announcement
                        ? "El anuncio se ha publicado correctamente"
                        : "El anuncio se ha eliminado",
                    })
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {announcement ? "Publicar Anuncio" : "Eliminar Anuncio"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de alerta de cambio de precio */}
        <AlertDialog open={priceAlert.show} onOpenChange={(open) => !open && setPriceAlert(prev => ({ ...prev, show: false }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cambio de Precio Detectado</AlertDialogTitle>
              <AlertDialogDescription>
                {priceAlert.message}
                <div className="mt-4 flex flex-col gap-4 p-4 bg-slate-50 rounded-md">
                  <div className="flex justify-center items-center gap-8">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-1">Precio Anterior</p>
                      <p className="text-xl font-bold text-gray-600">${priceAlert.oldPrice?.toFixed(2)}</p>
                    </div>
                    
                    <div className="flex flex-col items-center">
                       {priceAlert.newPrice > priceAlert.oldPrice ? (
                          <TrendingUp className="w-6 h-6 text-red-500 mb-1" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-green-500 mb-1" />
                        )}
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-1">Nuevo Precio</p>
                      <p className="text-xl font-bold text-blue-600">{priceAlert.newPrice ? formatCurrency(priceAlert.newPrice) : "-"}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-slate-500">Variación:</span>
                    <Badge variant={priceAlert.newPrice > priceAlert.oldPrice ? "destructive" : "default"} className={priceAlert.newPrice > priceAlert.oldPrice ? "bg-red-500" : "bg-green-500"}>
                      {priceAlert.oldPrice > 0 ? (
                        <>
                          {priceAlert.newPrice > priceAlert.oldPrice ? "+" : "-"}
                          {Math.abs(((priceAlert.newPrice - priceAlert.oldPrice) / priceAlert.oldPrice) * 100).toFixed(2)}%
                        </>
                      ) : "N/A"}
                    </Badge>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPriceAlert({ ...priceAlert, show: false })}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmPriceChange}>Confirmar y Guardar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de historial de SKU */}
        {skuHistoryModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4 text-blue-600">Historial del SKU: {skuHistoryModal.sku}</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-blue-500 to-blue-600">
                      <TableHead className="font-bold text-white text-center">Fecha</TableHead>
                      <TableHead className="font-bold text-white text-center">Costo s/IVA</TableHead>
                      <TableHead className="font-bold text-white text-center">PVP s/IVA</TableHead>
                      <TableHead className="font-bold text-white text-center">Cantidad</TableHead>
                      <TableHead className="font-bold text-white text-center">Proveedor</TableHead>
                      <TableHead className="font-bold text-white text-center">Factura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skuHistoryModal.history.map((item, index) => (
                      <TableRow key={index} className="hover:bg-slate-50/50">
                        <TableCell>{item.date_entered}</TableCell>
                        <TableCell>{formatCurrency(item.cost_without_tax)}</TableCell>
                        <TableCell>{formatCurrency(item.pvp_without_tax)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.suppliers?.name || "-"}</TableCell>
                        <TableCell>{item.invoice_number || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-6">
                <Button onClick={() => setSKUHistoryModal({ show: false, sku: "", history: [] })}>Cerrar</Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de vista previa de importación */}
        {importPreview.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 border-b">
                <h2 className="text-xl font-semibold text-emerald-800 mb-2">Vista Previa de Importación</h2>
                <p className="text-emerald-600">
                  Archivo: <strong>{importPreview.fileName}</strong>
                </p>
                <div className="flex gap-4 mt-3">
                  <div className="bg-blue-100 px-3 py-1 rounded-full">
                    <span className="text-blue-800 font-medium">Total: {importPreview.summary.total}</span>
                  </div>
                  <div className="bg-green-100 px-3 py-1 rounded-full">
                    <span className="text-green-800 font-medium">Válidos: {importPreview.summary.valid}</span>
                  </div>
                  <div className="bg-red-100 px-3 py-1 rounded-full">
                    <span className="text-red-800 font-medium">Errores: {importPreview.summary.errors.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Mostrar errores si los hay */}
                {importPreview.summary.errors.length > 0 && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-semibold text-red-800 mb-2">⚠️ Errores encontrados:</h3>
                    <div className="max-h-32 overflow-y-auto">
                      {importPreview.summary.errors.slice(0, 10).map((error, index) => (
                        <p key={index} className="text-sm text-red-600 mb-1">
                          • {error}
                        </p>
                      ))}
                      {importPreview.summary.errors.length > 10 && (
                        <p className="text-sm text-red-500 font-medium">
                          ... y {importPreview.summary.errors.length - 10} errores más
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tabla de vista previa */}
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">SKU</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">EAN</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Descripción</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Cantidad</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Costo</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">PVP</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Factura</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Proveedor</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Marca</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.data.slice(0, 50).map((row, index) => {
                        const sku = row.SKU?.toString().trim()
                        const description = row.DESCRIPCION?.toString().trim()
                        const cost = row.COSTO?.toString().trim()
                        const pvp = row.PVP?.toString().trim()
                        const brand = row.MARCA?.toString().trim()

                        const isValid =
                          sku &&
                          description &&
                          cost &&
                          pvp &&
                          brand &&
                          !isNaN(Number.parseFloat(cost)) &&
                          !isNaN(Number.parseFloat(pvp))

                        return (
                          <tr
                            key={index}
                            className={`${isValid ? "bg-green-50" : "bg-red-50"} border-b hover:bg-opacity-75`}
                          >
                            <td className="px-3 py-2 font-medium min-w-[150px]">
                              <div
                                className="font-mono whitespace-nowrap overflow-hidden text-ellipsis"
                                title={String(row.SKU || "")}
                              >
                                {String(row.SKU || "")}
                              </div>
                            </td>
                            <td className="px-3 py-2">{row.EAN || "-"}</td>
                            <td className="px-3 py-2 max-w-xs truncate">{row.DESCRIPCION || "-"}</td>
                            <td className="px-3 py-2">{row.CANTIDAD || "0"}</td>
                            <td className="px-3 py-2">${row.COSTO || "0"}</td>
                            <td className="px-3 py-2">${row.PVP || "0"}</td>
                            <td className="px-3 py-2">{row.FACTURA || "-"}</td>
                            <td className="px-3 py-2">{row.PROVEEDOR || "-"}</td>
                            <td className="px-3 py-2">{row.MARCA || "-"}</td>
                            <td className="px-3 py-2">
                              {isValid ? (
                                <span className="text-green-600 font-medium">✓ Válido</span>
                              ) : (
                                <span className="text-red-600 font-medium">✗ Error</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {importPreview.data.length > 50 && (
                    <div className="p-3 bg-gray-50 text-center text-sm text-gray-600">
                      Mostrando primeras 50 filas de {importPreview.data.length} total
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {importPreview.summary.valid > 0 ? (
                    <span className="text-green-600 font-medium">
                      ✓ {importPreview.summary.valid} productos listos para importar
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">✗ No hay productos válidos para importar</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setImportPreview({
                        show: false,
                        data: [],
                        fileName: "",
                        summary: { total: 0, valid: 0, errors: [] },
                      })
                    }
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmImport}
                    disabled={importPreview.summary.valid === 0}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                  >
                    Confirmar Importación ({importPreview.summary.valid} productos)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
