"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, Receipt, Filter, X, Plus, Edit, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { logActivity, hasPermission, getCurrentUser } from "@/lib/auth"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { logError } from "@/lib/logger"

type ExpenseCategory = {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

type Expense = {
  id: number
  description: string
  amount: number
  expense_date: string
  category_id: number | null
  has_invoice: boolean
  invoice_number: string | null
  invoice_date: string | null
  paid_by: number | null
  paid_date: string | null
  payment_method: "efectivo" | "transferencia" | "cheque" | "tarjeta"
  observations: string | null
  created_at: string
  created_by: number | null
  expense_categories?: { name: string }
  created_user?: { name: string }
  paid_user?: { name: string }
}

interface GastosManagementProps {
  isOpen: boolean
  onClose: () => void
  onUpdateExpenses?: (amount: number) => void
}

export function GastosManagement({ isOpen, onClose, onUpdateExpenses }: GastosManagementProps) {
  const currentUser = getCurrentUser()
  const isReadOnly = currentUser?.role === "viewer"

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [usersList, setUsersList] = useState<{ id: number; name: string; email: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean
    expense: Expense | null
  }>({ show: false, expense: null })

  const [filters, setFilters] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
    category: "all",
    paymentMethod: "all",
    hasInvoice: "all",
  })

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    category_id: "",
    has_invoice: false,
    invoice_number: "",
    invoice_date: "",
    paid_by: "",
    paid_date: "",
    payment_method: "efectivo" as "efectivo" | "transferencia" | "cheque" | "tarjeta",
    observations: "",
  })

  // Datos offline para modo sin Supabase - CORREGIDOS para el mes actual
  const currentDate = new Date()
  const currentMonth = currentDate.toISOString().slice(0, 7) // YYYY-MM

  const [offlineExpenses, setOfflineExpenses] = useState<Expense[]>([
    {
      id: 1,
      description:
        "Alquiler local comercial - " + currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
      amount: 150000,
      expense_date: currentDate.toISOString().split("T")[0], // Fecha actual
      category_id: 1,
      has_invoice: true,
      invoice_number: "ALQ-001",
      invoice_date: currentDate.toISOString().split("T")[0],
      paid_by: 1,
      paid_date: currentDate.toISOString().split("T")[0],
      payment_method: "transferencia",
      observations: "Alquiler mensual",
      created_at: currentDate.toISOString(),
      created_by: 1,
      expense_categories: { name: "Alquiler" },
      created_user: { name: "Administrador MAYCAM" },
      paid_user: { name: "Administrador MAYCAM" },
    },
    {
      id: 2,
      description: "Combustible vehículo reparto",
      amount: 25000,
      expense_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Hace 2 días
      category_id: 2,
      has_invoice: true,
      invoice_number: "COMB-002",
      invoice_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      paid_by: 1,
      paid_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      payment_method: "efectivo",
      observations: "Carga completa",
      created_at: new Date().toISOString(),
      created_by: 1,
      expense_categories: { name: "Combustible" },
      created_user: { name: "Administrador MAYCAM" },
      paid_user: { name: "Administrador MAYCAM" },
    },
  ])

  const [offlineCategories] = useState<ExpenseCategory[]>([
    {
      id: 1,
      name: "Alquiler",
      description: "Gastos de alquiler de local comercial",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Combustible",
      description: "Gastos de combustible para vehículos",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      name: "Flete",
      description: "Gastos de transporte y envíos",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 4,
      name: "Flex",
      description: "Gastos de publicidad y marketing",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 5,
      name: "Servicios",
      description: "Servicios públicos (luz, agua, gas, internet)",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 6,
      name: "Limpieza",
      description: "Productos y servicios de limpieza",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 7,
      name: "Gastos Varios",
      description: "Otros gastos no categorizados",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ])

  const [offlineUsers] = useState<{ id: number; name: string; email: string }[]>([
    { id: 1, name: "Administrador MAYCAM", email: "maycamadmin@maycam.com" },
  ])

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  useEffect(() => {
    if (onUpdateExpenses) {
      const total = getCurrentMonthTotal()
      onUpdateExpenses(total)
    }
  }, [expenses, filters.month, onUpdateExpenses])

  const loadData = async () => {
    setLoading(true)
    try {
      if (!isSupabaseConfigured) {
        // Modo offline
        console.log("🔄 Cargando datos offline...")
        setExpenses(offlineExpenses)

        // Actualizar el callback con el total del mes actual en modo offline
        if (onUpdateExpenses) {
          const currentMonth = new Date().toISOString().slice(0, 7)
          const currentMonthExpenses = offlineExpenses.filter((expense) =>
            expense.expense_date.startsWith(currentMonth),
          )
          const total = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
          onUpdateExpenses(total)
        }
        setCategories(offlineCategories)
        setUsersList(offlineUsers)
        console.log("✅ Datos offline cargados:", {
          expenses: offlineExpenses.length,
          categories: offlineCategories.length,
          users: offlineUsers.length,
        })
        setLoading(false)
        return
      }

      // Cargar categorías
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("is_active", true)
        .order("name")

      if (categoriesError) throw categoriesError

      // Cargar usuarios
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("is_active", true)
        .order("name")

      if (usersError) throw usersError

      // Cargar gastos con relaciones
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_categories (name),
          created_user:created_by (name),
          paid_user:paid_by (name)
        `)
        .order("expense_date", { ascending: false })

      if (expensesError) throw expensesError

      setExpenses(expensesData || [])

      // Actualizar el callback con el total del mes actual
      if (onUpdateExpenses) {
        const currentMonth = new Date().toISOString().slice(0, 7)
        const currentMonthExpenses = (expensesData || []).filter((expense) =>
          expense.expense_date.startsWith(currentMonth),
        )
        const total = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
        onUpdateExpenses(total)
      }

      setCategories(categoriesData || [])
      setUsersList(usersData || [])
    } catch (error) {
      logError("Error loading expenses data:", error)
      toast({
        title: "Error",
        description: "Error al cargar los datos de gastos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getFilteredExpenses = () => {
    console.log("🔍 Aplicando filtros...")
    console.log("📊 Total expenses:", expenses.length)
    console.log("📅 Filtro mes:", filters.month)

    let filtered = [...expenses]
    console.log(
      "📋 Expenses antes de filtrar:",
      filtered.map((e) => ({
        id: e.id,
        description: e.description,
        date: e.expense_date,
        amount: e.amount,
      })),
    )

    // Filtrar por mes
    if (filters.month) {
      const beforeFilter = filtered.length
      filtered = filtered.filter((expense) => {
        const expenseMonth = expense.expense_date.slice(0, 7) // YYYY-MM
        const matches = expenseMonth === filters.month
        console.log(
          `📅 Expense ${expense.id}: ${expense.expense_date} (${expenseMonth}) vs ${filters.month} = ${matches}`,
        )
        return matches
      })
      console.log(`📅 Filtro por mes: ${beforeFilter} -> ${filtered.length}`)
    }

    // Filtrar por categoría
    if (filters.category !== "all") {
      const beforeFilter = filtered.length
      filtered = filtered.filter((expense) => expense.category_id?.toString() === filters.category)
      console.log(`🏷️ Filtro por categoría: ${beforeFilter} -> ${filtered.length}`)
    }

    // Filtrar por método de pago
    if (filters.paymentMethod !== "all") {
      const beforeFilter = filtered.length
      filtered = filtered.filter((expense) => expense.payment_method === filters.paymentMethod)
      console.log(`💳 Filtro por método de pago: ${beforeFilter} -> ${filtered.length}`)
    }

    // Filtrar por factura
    if (filters.hasInvoice !== "all") {
      const beforeFilter = filtered.length
      const hasInvoice = filters.hasInvoice === "true"
      filtered = filtered.filter((expense) => expense.has_invoice === hasInvoice)
      console.log(`🧾 Filtro por factura: ${beforeFilter} -> ${filtered.length}`)
    }

    console.log("✅ Expenses filtrados:", filtered.length)
    return filtered
  }

  const getCurrentMonthTotal = () => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const currentMonthExpenses = expenses.filter((expense) => expense.expense_date.startsWith(currentMonth))
    const total = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    console.log("💰 Calculando total del mes actual:", {
      currentMonth,
      expensesCount: currentMonthExpenses.length,
      total,
    })
    return total
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormData({
      description: "",
      amount: "",
      expense_date: new Date().toISOString().split("T")[0],
      category_id: "",
      has_invoice: false,
      invoice_number: "",
      invoice_date: "",
      paid_by: "",
      paid_date: "",
      payment_method: "efectivo",
      observations: "",
    })
    setEditingExpense(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!hasPermission("CREATE_EXPENSE")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para crear gastos",
        variant: "destructive",
      })
      return
    }

    // Validaciones
    if (!formData.description.trim()) {
      toast({
        title: "Campo requerido",
        description: "La descripción es obligatoria",
        variant: "destructive",
      })
      return
    }

    if (!formData.amount || Number.parseFloat(formData.amount) <= 0) {
      toast({
        title: "Campo requerido",
        description: "El monto debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    const expenseData = {
      description: formData.description.trim(),
      amount: Number.parseFloat(formData.amount),
      expense_date: formData.expense_date,
      category_id: formData.category_id ? Number.parseInt(formData.category_id) : null,
      has_invoice: formData.has_invoice,
      invoice_number: formData.invoice_number.trim() || null,
      invoice_date: formData.invoice_date || null,
      paid_by: formData.paid_by ? Number.parseInt(formData.paid_by) : null,
      paid_date: formData.paid_date || null,
      payment_method: formData.payment_method,
      observations: formData.observations.trim() || null,
    }

    try {
      if (!isSupabaseConfigured) {
        // Modo offline
        const newExpense: Expense = {
          id: Date.now(),
          ...expenseData,
          created_at: new Date().toISOString(),
          created_by: getCurrentUser()?.id || 1,
          expense_categories: categories.find((c) => c.id === expenseData.category_id)
            ? { name: categories.find((c) => c.id === expenseData.category_id)!.name }
            : undefined,
          created_user: { name: getCurrentUser()?.name || "Usuario" },
          paid_user: expenseData.paid_by
            ? { name: usersList.find((u) => u.id === expenseData.paid_by)?.name || "Usuario" }
            : undefined,
        }

        if (editingExpense) {
          setOfflineExpenses((prev) =>
            prev.map((exp) => (exp.id === editingExpense.id ? { ...newExpense, id: editingExpense.id } : exp)),
          )
          await logActivity(
            "EDIT_EXPENSE",
            "expenses",
            editingExpense.id,
            editingExpense,
            newExpense,
            `Gasto ${newExpense.description} actualizado`,
          )
        } else {
          setOfflineExpenses((prev) => [newExpense, ...prev])
          await logActivity(
            "CREATE_EXPENSE",
            "expenses",
            newExpense.id,
            null,
            newExpense,
            `Gasto ${newExpense.description} creado`,
          )
        }

        setExpenses(
          editingExpense
            ? expenses.map((exp) => (exp.id === editingExpense.id ? { ...newExpense, id: editingExpense.id } : exp))
            : [newExpense, ...expenses],
        )

        if (onUpdateExpenses) {
          const currentMonth = new Date().toISOString().slice(0, 7)
          const updatedExpenses = editingExpense
            ? expenses.map((exp) => (exp.id === editingExpense.id ? { ...newExpense, id: editingExpense.id } : exp))
            : [newExpense, ...expenses]
          const currentMonthExpenses = updatedExpenses.filter((expense) =>
            expense.expense_date.startsWith(currentMonth),
          )
          const total = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
          onUpdateExpenses(total)
        }

        toast({
          title: "Modo Offline - Datos temporales",
          description: editingExpense
            ? "Gasto actualizado solo localmente. Configure Supabase para persistir."
            : "Gasto agregado solo localmente. Configure Supabase para persistir.",
          variant: "destructive",
        })

        resetForm()
        return
      }

      // Modo con Supabase
      if (editingExpense) {
        const { error } = await supabase
          .from("expenses")
          .update({
            ...expenseData,
            updated_by: getCurrentUser()?.id,
          })
          .eq("id", editingExpense.id)

        if (error) throw error

        await logActivity(
          "EDIT_EXPENSE",
          "expenses",
          editingExpense.id,
          editingExpense,
          expenseData,
          `Gasto ${expenseData.description} actualizado`,
        )

        toast({
          title: "Éxito",
          description: "Gasto actualizado correctamente",
        })
      } else {
        const { data, error } = await supabase
          .from("expenses")
          .insert([
            {
              ...expenseData,
              created_by: getCurrentUser()?.id,
            },
          ])
          .select()
          .single()

        if (error) throw error

        await logActivity("CREATE_EXPENSE", "expenses", data.id, null, data, `Gasto ${data.description} creado`)

        toast({
          title: "Éxito",
          description: "Gasto agregado correctamente",
        })
      }

      resetForm()
      loadData()
    } catch (error) {
      logError("Error saving expense:", error)
      toast({
        title: "Error",
        description: "Error al guardar el gasto",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (expense: Expense) => {
    if (!hasPermission("EDIT_EXPENSE")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para editar gastos",
        variant: "destructive",
      })
      return
    }

    setEditingExpense(expense)
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      category_id: expense.category_id?.toString() || "",
      has_invoice: expense.has_invoice,
      invoice_number: expense.invoice_number || "",
      invoice_date: expense.invoice_date || "",
      paid_by: expense.paid_by?.toString() || "",
      paid_date: expense.paid_date || "",
      payment_method: expense.payment_method,
      observations: expense.observations || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (expense: Expense) => {
    if (!hasPermission("DELETE_EXPENSE")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para eliminar gastos",
        variant: "destructive",
      })
      return
    }

    try {
      if (!isSupabaseConfigured) {
        setOfflineExpenses((prev) => prev.filter((exp) => exp.id !== expense.id))
        setExpenses((prev) => prev.filter((exp) => exp.id !== expense.id))
        await logActivity(
          "DELETE_EXPENSE",
          "expenses",
          expense.id,
          expense,
          null,
          `Gasto ${expense.description} eliminado`,
        )

        if (onUpdateExpenses) {
          const currentMonth = new Date().toISOString().slice(0, 7)
          const updatedExpenses = expenses.filter((exp) => exp.id !== expense.id)
          const currentMonthExpenses = updatedExpenses.filter((expense) =>
            expense.expense_date.startsWith(currentMonth),
          )
          const total = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
          onUpdateExpenses(total)
        }

        toast({
          title: "Éxito (Modo Offline)",
          description: "Gasto eliminado localmente",
        })
        setDeleteConfirm({ show: false, expense: null })
        return
      }

      const { error } = await supabase.from("expenses").delete().eq("id", expense.id)

      if (error) throw error

      await logActivity(
        "DELETE_EXPENSE",
        "expenses",
        expense.id,
        expense,
        null,
        `Gasto ${expense.description} eliminado`,
      )

      toast({
        title: "Éxito",
        description: "Gasto eliminado correctamente",
      })

      setDeleteConfirm({ show: false, expense: null })
      loadData()
    } catch (error) {
      logError("Error deleting expense:", error)
      toast({
        title: "Error",
        description: "Error al eliminar el gasto",
        variant: "destructive",
      })
    }
  }

  const exportToExcel = () => {
    if (!hasPermission("EXPORT")) {
      toast({
        title: "Sin permisos",
        description: "No tiene permisos para exportar datos",
        variant: "destructive",
      })
      return
    }

    const filtered = getFilteredExpenses()

    const headers = [
      "Fecha",
      "Discripciónpción",
      "Categoría",
      "Monto",
      "Método Pago",
      "Tiene Factura",
      "Nº Factura",
      "Fecha Factura",
      "Cargado por",
      "Pagado por",
      "Fecha Pago",
      "Observaciones",
    ]

    const csvRows = filtered.map((expense) => [
      expense.expense_date,
      expense.description,
      expense.expense_categories?.name || "Sin categoría",
      `$${expense.amount.toFixed(2)}`,
      expense.payment_method,
      expense.has_invoice ? "Sí" : "No",
      expense.invoice_number || "",
      expense.invoice_date || "",
      expense.created_user?.name || "",
      expense.paid_user?.name || "",
      expense.paid_date || "",
      expense.observations || "",
    ])

    const excelContent = `
<html>
<head>
<meta charset="utf-8">
<style>
.header { 
  background-color: #14B8A6; 
  color: white; 
  font-weight: bold; 
  text-align: center; 
  padding: 8px;
  border: 1px solid #0F766E;
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
.categoria-alquiler { background-color: #FEF3C7; }
.categoria-combustible { background-color: #DBEAFE; }
.categoria-servicios { background-color: #E0E7FF; }
.categoria-limpieza { background-color: #D1FAE5; }
.con-factura { background-color: #D1FAE5; }
.sin-factura { background-color: #FEE2E2; }
</style>
</head>
<body>
<h2 style="text-align: center; color: #14B8A6; margin-bottom: 20px;">GASTOS MENSUALES - ${filters.month}</h2>
<table>
<tr>
${headers.map((h) => `<th class="header">${h}</th>`).join("")}
</tr>
${csvRows
  .map((row, index) => {
    const expense = filtered[index]
    const categoryClass = expense.expense_categories?.name.toLowerCase().includes("alquiler")
      ? "categoria-alquiler"
      : expense.expense_categories?.name.toLowerCase().includes("combustible")
        ? "categoria-combustible"
        : expense.expense_categories?.name.toLowerCase().includes("servicios")
          ? "categoria-servicios"
          : expense.expense_categories?.name.toLowerCase().includes("limpieza")
            ? "categoria-limpieza"
            : ""

    return `<tr>
    <td class="data-center">${row[0]}</td>
    <td class="data">${row[1]}</td>
    <td class="data-center ${categoryClass}">${row[2]}</td>
    <td class="data-number">${row[3]}</td>
    <td class="data-center">${row[4]}</td>
    <td class="data-center ${expense.has_invoice ? "con-factura" : "sin-factura"}">${row[5]}</td>
    <td class="data">${row[6]}</td>
    <td class="data-center">${row[7]}</td>
    <td class="data">${row[8]}</td>
    <td class="data">${row[9]}</td>
    <td class="data-center">${row[10]}</td>
    <td class="data">${row[11]}</td>
  </tr>`
  })
  .join("")}
</table>
<div style="margin-top: 20px; text-align: right; font-weight: bold; color: #14B8A6;">
  Total del período: $${filtered.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
</div>
</body>
</html>`

    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gastos_${filters.month}_maycam.xls`
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
      { count: filtered.length, type: "gastos" },
      `Exportación de gastos: ${filtered.length} registros`,
    )

    toast({
      title: "Exportación completada",
      description: `Se exportaron ${filtered.length} gastos del período ${filters.month}`,
    })
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      efectivo: "Efectivo",
      transferencia: "Transferencia",
      cheque: "Cheque",
      tarjeta: "Tarjeta",
    }
    return labels[method as keyof typeof labels] || method
  }

  const getPaymentMethodColor = (method: string) => {
    const colors = {
      efectivo: "bg-green-100 text-green-800 border-green-200",
      transferencia: "bg-blue-100 text-blue-800 border-blue-200",
      cheque: "bg-yellow-100 text-yellow-800 border-yellow-200",
      tarjeta: "bg-purple-100 text-purple-800 border-purple-200",
    }
    return colors[method as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const filteredExpenses = getFilteredExpenses()
  const currentMonthTotal = getCurrentMonthTotal()

  console.log("📊 Estado final:")
  console.log("- Total expenses:", expenses.length)
  console.log("- Filtered expenses:", filteredExpenses.length)
  console.log("- Current month total:", currentMonthTotal)
  console.log("- Filters:", filters)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-teal-600" />
            Gestión de Gastos Mensuales
          </DialogTitle>
          <DialogDescription>Administre todos los gastos de la empresa con control detallado</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen del mes actual y mes filtrado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resumen del mes actual */}
            <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-teal-100 text-sm">Total Gastos Mes Actual</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(currentMonthTotal)}
                    </p>
                  </div>
                  <Receipt className="w-8 h-8 text-teal-200" />
                </div>
              </CardContent>
            </Card>

            {/* Resumen del mes filtrado (solo si es diferente al mes actual) */}
            {filters.month !== new Date().toISOString().slice(0, 7) && (
              <Card className="bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Total Gastos Mes Filtrado</p>
                      <p className="text-2xl font-bold">
                        $
                        {filteredExpenses
                          .reduce((sum, exp) => sum + exp.amount, 0)
                          .toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-orange-200 text-xs">
                        {(() => {
                          const [year, month] = filters.month.split("-")
                          const monthNames = [
                            "enero",
                            "febrero",
                            "marzo",
                            "abril",
                            "mayo",
                            "junio",
                            "julio",
                            "agosto",
                            "septiembre",
                            "octubre",
                            "noviembre",
                            "diciembre",
                          ]
                          return `${monthNames[Number.parseInt(month) - 1]} de ${year}`
                        })()}
                      </p>
                    </div>
                    <Receipt className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4 items-center">
            {!isReadOnly && hasPermission("CREATE_EXPENSE") && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Gasto
              </Button>
            )}
            <Button onClick={exportToExcel} variant="outline" className="shadow-sm bg-transparent">
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
            <div className="text-sm text-gray-500">
              Total filtrado: {formatCurrency(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-slate-500 border-r border-slate-200 pr-3 mr-1">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline-block">Filtros</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Mes:</span>
              <Input
                id="filterMonth"
                type="month"
                value={filters.month}
                onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
                className="h-8 w-auto text-sm py-0 px-2"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="h-8 text-sm w-[160px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={filters.paymentMethod}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger className="h-8 text-sm w-[140px]">
                  <SelectValue placeholder="Método de Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los métodos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={filters.hasInvoice}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, hasInvoice: value }))}
              >
                <SelectTrigger className="h-8 text-sm w-[120px]">
                  <SelectValue placeholder="Factura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Factura: Todos</SelectItem>
                  <SelectItem value="true">Con factura</SelectItem>
                  <SelectItem value="false">Sin factura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setFilters({
                  month: new Date().toISOString().slice(0, 7),
                  category: "all",
                  paymentMethod: "all",
                  hasInvoice: "all",
                })
              }
              className="ml-auto h-8 w-8 p-0 text-slate-400 hover:text-red-500 rounded-full"
              title="Limpiar filtros"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabla de gastos */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-t-lg">
              <CardTitle className="text-teal-800">Lista de Gastos ({filteredExpenses.length} registros)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-teal-500 to-cyan-600">
                      <TableHead className="font-bold text-white text-center border border-slate-300">Fecha</TableHead>
                      <TableHead className="font-bold text-white text-center border border-slate-300">
                        Nombre
                      </TableHead>
                      <TableHead className="font-bold text-white text-center border border-slate-300 hidden md:table-cell">
                        Categoría
                      </TableHead>
                      <TableHead className="font-bold text-white text-center border border-slate-300">Monto</TableHead>
                      <TableHead className="font-bold text-white text-center border border-slate-300 hidden md:table-cell">
                        Método Pago
                      </TableHead>
                      <TableHead className="font-bold text-white text-center border border-slate-300 hidden md:table-cell">
                        Factura
                      </TableHead>
                      <TableHead className="font-bold text-white text-center border border-slate-300 hidden md:table-cell">
                        Cargado por
                      </TableHead>
                      <TableHead className="font-bold text-white text-center border border-slate-300 hidden md:table-cell">
                        Pagado por
                      </TableHead>
                      <TableHead className="font-bold text-white text-center border border-slate-300">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                            <span className="ml-2">Cargando gastos...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredExpenses.length > 0 ? (
                      filteredExpenses.map((expense) => (
                        <TableRow key={expense.id} className="hover:bg-slate-50/50">
                          <TableCell className="border border-slate-200 text-center">
                            {new Date(expense.expense_date).toLocaleDateString("es-ES")}
                          </TableCell>
                          <TableCell className="border border-slate-200 max-w-xs">{expense.description}</TableCell>
                          <TableCell className="border border-slate-200 text-center hidden md:table-cell">
                            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                              {expense.expense_categories?.name || "Sin categoría"}
                            </Badge>
                          </TableCell>
                          <TableCell className="border border-slate-200 text-right font-medium">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell className="border border-slate-200 text-center hidden md:table-cell">
                            <Badge variant="outline" className={getPaymentMethodColor(expense.payment_method)}>
                              {getPaymentMethodLabel(expense.payment_method)}
                            </Badge>
                          </TableCell>
                          <TableCell className="border border-slate-200 text-center hidden md:table-cell">
                            <div className="space-y-1">
                              <Badge variant={expense.has_invoice ? "default" : "secondary"}>
                                {expense.has_invoice ? "Sí" : "No"}
                              </Badge>
                              {expense.has_invoice && expense.invoice_number && (
                                <div className="text-xs text-gray-600">{expense.invoice_number}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="border border-slate-200 hidden md:table-cell">
                            {expense.created_user?.name || "N/A"}
                          </TableCell>
                          <TableCell className="border border-slate-200 hidden md:table-cell">
                            <div className="space-y-1">
                              <div>{expense.paid_user?.name || "N/A"}</div>
                              {expense.paid_date && (
                                <div className="text-xs text-gray-600">
                                  {new Date(expense.paid_date).toLocaleDateString("es-ES")}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="border border-slate-200">
                            <div className="flex gap-2">
                              {hasPermission("EDIT_EXPENSE") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(expense)}
                                  className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                              {hasPermission("DELETE_EXPENSE") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirm({ show: true, expense })}
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
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
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <Receipt className="w-12 h-12 text-gray-300" />
                            <p>No se encontraron gastos para los filtros seleccionados</p>
                            <p className="text-sm text-gray-400">
                              Mes actual: {filters.month} | Total expenses: {expenses.length}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>

      {/* Modal de formulario */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle>
            <DialogDescription>Complete la información del gasto</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description">Nombre *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Nombre del gasto"
                />
              </div>
              <div>
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expense_date">Fecha del Gasto *</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => handleInputChange("expense_date", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category_id">Categoría</Label>
                <Select value={formData.category_id} onValueChange={(value) => handleInputChange("category_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment_method">Método de Pago</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value: "efectivo" | "transferencia" | "cheque" | "tarjeta") =>
                    handleInputChange("payment_method", value)
                  }
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paid_by">Pagado por</Label>
                <Select value={formData.paid_by} onValueChange={(value) => handleInputChange("paid_by", value)} disabled={isReadOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersList.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paid_date">Fecha de Pago</Label>
                <Input
                  id="paid_date"
                  type="date"
                  value={formData.paid_date}
                  onChange={(e) => handleInputChange("paid_date", e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="has_invoice"
                  checked={formData.has_invoice}
                  onCheckedChange={(checked) => handleInputChange("has_invoice", checked)}
                  disabled={isReadOnly}
                />
                <Label htmlFor="has_invoice">Tiene factura</Label>
              </div>
            </div>
            {formData.has_invoice && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_number">Número de Factura</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={(e) => handleInputChange("invoice_number", e.target.value)}
                    placeholder="Número de factura"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_date">Fecha de Factura</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => handleInputChange("invoice_date", e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleInputChange("observations", e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={3}
                disabled={isReadOnly}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancelar
            </Button>
            {!isReadOnly && (
              <Button type="submit" onClick={handleSubmit}>
                {editingExpense ? "Actualizar" : "Crear"} Gasto
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={deleteConfirm.show} onOpenChange={(show) => setDeleteConfirm({ ...deleteConfirm, show })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar el gasto "{deleteConfirm.expense?.description}"? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setDeleteConfirm({ show: false, expense: null })}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              onClick={() => {
                if (deleteConfirm.expense) {
                  handleDelete(deleteConfirm.expense)
                }
              }}
            >
              Eliminar Gasto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
