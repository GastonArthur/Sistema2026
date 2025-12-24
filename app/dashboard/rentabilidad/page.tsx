"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  ShoppingCart, 
  Settings, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  BarChart3
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

// Initialize Supabase Client (Client Side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null

export default function RentabilidadPage() {
  const [activeTab, setActiveTab] = useState("summary")
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [setupMode, setSetupMode] = useState(false)
  
  // Sidebar State (Dummy to satisfy interface)
  const [sidebarActiveTab, setSidebarActiveTab] = useState("")
  const [showWholesale, setShowWholesale] = useState(false)
  const [showRetail, setShowRetail] = useState(false)
  const [showGastos, setShowGastos] = useState(false)
  const [showClients, setShowClients] = useState(false)

  // Redirect to main app for other tabs
  const handleSidebarNavigation = (tab: string) => {
    window.location.href = "/"
  }
  const handleSidebarOpen = (val: boolean) => {
    if(val) window.location.href = "/"
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    if (!supabase) return
    try {
      setLoading(true)
      const { data, error } = await supabase.from("rt_ml_accounts").select("*")
      if (error) throw error
      setAccounts(data || [])
      if (data && data.length === 0) {
        setSetupMode(true)
        setActiveTab("config")
      }
    } catch (err) {
      console.error("Error fetching accounts:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar 
        activeTab={sidebarActiveTab}
        setActiveTab={handleSidebarNavigation}
        setShowWholesale={handleSidebarOpen}
        setShowRetail={handleSidebarOpen}
        setShowGastos={handleSidebarOpen}
        setShowClients={handleSidebarOpen}
        onLogout={() => window.location.href = "/"} // TODO: Handle logout
        userEmail="Usuario" // TODO: Get real user
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5" />
            Rentabilidad Real
          </div>
        </header>
        
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Panel de Rentabilidad</h2>
            <div className="flex items-center space-x-2">
              <Button onClick={fetchAccounts} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </div>

          {setupMode && (
            <Alert variant="default" className="mb-6 border-blue-200 bg-blue-50 text-blue-800">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Bienvenido al módulo de Rentabilidad Real</AlertTitle>
              <AlertDescription>
                Parece que es tu primera vez aquí. Configura tus cuentas de MercadoLibre para comenzar.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="summary">Resumen</TabsTrigger>
              <TabsTrigger value="sales">Ventas</TabsTrigger>
              <TabsTrigger value="products">Productos</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="config">Configuración</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$0.00</div>
                    <p className="text-xs text-muted-foreground">+0% del mes pasado</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ganancia Real</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$0.00</div>
                    <p className="text-xs text-muted-foreground">+0% del mes pasado</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0%</div>
                    <p className="text-xs text-muted-foreground">+0% del mes pasado</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ventas</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs text-muted-foreground">+0% del mes pasado</p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Evolución de Ganancias</CardTitle>
                  </CardHeader>
                  <CardContent className="pl-2">
                    {/* Chart placeholder */}
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      Gráfico de Ganancias
                    </div>
                  </CardContent>
                </Card>
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Cuentas Activas</CardTitle>
                    <CardDescription>
                      Estado de conexión con MercadoLibre
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {accounts.map(acc => (
                        <div key={acc.id} className="flex items-center">
                          <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">{acc.name}</p>
                            <p className="text-sm text-muted-foreground">Seller ID: {acc.seller_id}</p>
                          </div>
                          <div className="ml-auto font-medium text-green-600">Conectado</div>
                        </div>
                      ))}
                      {accounts.length === 0 && (
                        <div className="text-sm text-muted-foreground">No hay cuentas configuradas</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="config">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Cuentas</CardTitle>
                  <CardDescription>
                    Agrega tus cuentas de MercadoLibre. Necesitas el Refresh Token inicial.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 py-4">
                     {/* Add Account Form */}
                     <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="name" className="text-right">Nombre</Label>
                       <Input 
                         id="name" 
                         placeholder="Ej: Cuenta Principal" 
                         className="col-span-3" 
                         value={newAccount.name}
                         onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                       />
                     </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="seller_id" className="text-right">Seller ID</Label>
                       <Input 
                         id="seller_id" 
                         placeholder="123456789" 
                         className="col-span-3" 
                         value={newAccount.seller_id}
                         onChange={e => setNewAccount({...newAccount, seller_id: e.target.value})}
                       />
                     </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="token" className="text-right">Refresh Token</Label>
                       <Input 
                         id="token" 
                         type="password" 
                         placeholder="TG-..." 
                         className="col-span-3" 
                         value={newAccount.refresh_token}
                         onChange={e => setNewAccount({...newAccount, refresh_token: e.target.value})}
                       />
                     </div>
                     <div className="flex justify-end">
                        <Button onClick={handleAddAccount} disabled={addingAccount}>
                          {addingAccount ? "Conectando..." : "Conectar Cuenta"}
                        </Button>
                     </div>
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-lg font-medium">Tablas de Datos</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Estado de las tablas del módulo.
                    </p>
                    {/* Schema Check Info */}
                    <div className="flex items-center gap-2">
                       <CheckCircle className="h-4 w-4 text-green-500" />
                       <span className="text-sm">Tablas de Rentabilidad (rt_*) detectadas.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="stock">
                <Card>
                    <CardHeader>
                        <CardTitle>Stock en Vivo</CardTitle>
                        <CardDescription>Sincronizado desde MercadoLibre</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Cuenta</TableHead>
                                    <TableHead>Cantidad</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Actualizado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">No hay datos sincronizados aún.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
