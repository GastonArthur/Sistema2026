"use client"

import {
  Package,
  Users,
  Tag,
  DollarSign,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  LayoutDashboard,
  FileSpreadsheet,
  Settings,
  LogOut,
  UserCircle
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

export type SidebarNavigationProps = {
  activeTab: string
  setActiveTab: (tab: string) => void
  setShowWholesale: (show: boolean) => void
  setShowRetail: (show: boolean) => void
  setShowGastos: (show: boolean) => void
  setShowClients: (show: boolean) => void
  onLogout: () => void
  userEmail?: string
  isOnline?: boolean
  lastSync?: Date | null
}

export function AppSidebar({
  activeTab,
  setActiveTab,
  setShowWholesale,
  setShowRetail,
  setShowGastos,
  setShowClients,
  onLogout,
  userEmail,
  isOnline = true,
  lastSync
}: SidebarNavigationProps) {

  const handleNavigation = (tab: string) => {
    setActiveTab(tab)
    setShowWholesale(false)
    setShowRetail(false)
    setShowGastos(false)
    setShowClients(false)
  }

  const handleOpenWholesale = () => {
    setShowWholesale(true)
    setShowRetail(false)
    setShowGastos(false)
    setShowClients(false)
    // Optionally set active tab to something generic or keep current
  }

  const handleOpenRetail = () => {
    setShowRetail(true)
    setShowWholesale(false)
    setShowGastos(false)
    setShowClients(false)
  }

  const handleOpenGastos = () => {
    setShowGastos(true)
    setShowWholesale(false)
    setShowRetail(false)
    setShowClients(false)
  }

  const handleOpenClients = () => {
    setShowClients(true)
    setShowWholesale(false)
    setShowRetail(false)
    setShowGastos(false)
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex flex-col px-4 py-2 gap-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="size-4" />
            </div>
            <div className="font-semibold text-lg">Sistema Maycam</div>
          </div>
          <div className="flex flex-col pl-10 gap-0.5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className={`text-xs ${isOnline ? "text-green-600" : "text-red-600"}`}>
                {isOnline ? "En línea" : "Sin conexión"}
              </span>
            </div>
            {lastSync && (
               <span className="text-[10px] text-muted-foreground pl-4">
                 Última sync: {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
             )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === "inventory" && !setShowWholesale && !setShowGastos} // Simplified check, logic might need adjustment in parent
                  onClick={() => handleNavigation("inventory")}
                >
                  <LayoutDashboard />
                  <span>Inventario</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === "import"}
                  onClick={() => handleNavigation("import")}
                >
                  <FileSpreadsheet />
                  <span>Importar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestión</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleOpenClients}>
                  <Users />
                  <span>Clientes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("brands")}
                  isActive={activeTab === "brands"}
                >
                  <Tag />
                  <span>Marcas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("suppliers")}
                  isActive={activeTab === "suppliers"}
                >
                  <Users />
                  <span>Proveedores</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("precios")}
                  isActive={activeTab === "precios"}
                >
                  <DollarSign />
                  <span>Precios a Publicar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("zentor")}
                  isActive={activeTab === "zentor"}
                >
                  <Package />
                  <span>Lista ZENTOR</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ventas y Gastos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/dashboard/rentabilidad">
                    <TrendingUp />
                    <span>Rentabilidad Real</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleOpenRetail}>
                  <ShoppingBag />
                  <span>Ventas Minoristas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleOpenWholesale}>
                  <ShoppingCart />
                  <span>Ventas Mayoristas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleOpenGastos}>
                  <Receipt />
                  <span>Gastos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
              <UserCircle className="size-4" />
              <span className="truncate">{userEmail || "Usuario"}</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <LogOut />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
