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
  UserCircle,
  TrendingUp,
  ShieldCheck
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
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

export type SidebarNavigationProps = {
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
  userEmail?: string
  isOnline?: boolean
  lastSync?: Date | null
}

export function AppSidebar({
  activeTab,
  setActiveTab,
  onLogout,
  userEmail,
  isOnline = true,
  lastSync
}: SidebarNavigationProps) {

  const handleNavigation = (tab: string) => {
    setActiveTab(tab)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/50 pb-4 mb-2 bg-gradient-to-r from-sidebar-background to-sidebar-accent/30">
        <div className="flex flex-col px-4 py-2 gap-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
          <div className="flex items-center justify-between w-full group-data-[collapsible=icon]:justify-center">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 shrink-0">
                <Package className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight">Sistema Maycam</span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Dashboard</span>
              </div>
            </div>
            <SidebarTrigger />
          </div>
          <div className="flex flex-col pl-[3.25rem] gap-1 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shadow-sm ${isOnline ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50"}`}></div>
              <span className={`text-xs font-medium ${isOnline ? "text-emerald-600" : "text-red-600"}`}>
                {isOnline ? "En línea" : "Sin conexión"}
              </span>
            </div>
            {lastSync && (
               <span className="text-[10px] text-muted-foreground/80 font-mono">
                 Sync: {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
             )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-blue-600 font-bold uppercase tracking-wider text-[10px] mb-1">Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === "inventory"} 
                  onClick={() => handleNavigation("inventory")}
                  tooltip="Inventario"
                  className="group/btn hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 ease-in-out data-[active=true]:bg-blue-100 data-[active=true]:text-blue-800"
                >
                  <LayoutDashboard className="group-hover/btn:scale-110 transition-transform text-blue-500/80 group-hover/btn:text-blue-600 group-data-[active=true]:text-blue-700" />
                  <span className="font-medium">Inventario</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeTab === "import"}
                  onClick={() => handleNavigation("import")}
                  tooltip="Importar"
                  className="group/btn hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 ease-in-out data-[active=true]:bg-blue-100 data-[active=true]:text-blue-800"
                >
                  <FileSpreadsheet className="group-hover/btn:scale-110 transition-transform text-blue-500/80 group-hover/btn:text-blue-600 group-data-[active=true]:text-blue-700" />
                  <span className="font-medium">Importar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-violet-600 font-bold uppercase tracking-wider text-[10px] mb-1">Gestión</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("clients")}
                  isActive={activeTab === "clients"}
                  tooltip="Clientes"
                  className="group/btn hover:bg-violet-50 hover:text-violet-700 transition-all duration-200 ease-in-out data-[active=true]:bg-violet-100 data-[active=true]:text-violet-800"
                >
                  <Users className="group-hover/btn:scale-110 transition-transform text-violet-500/80 group-hover/btn:text-violet-600 group-data-[active=true]:text-violet-700" />
                  <span className="font-medium">Clientes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("brands")}
                  isActive={activeTab === "brands"}
                  tooltip="Marcas"
                  className="group/btn hover:bg-violet-50 hover:text-violet-700 transition-all duration-200 ease-in-out data-[active=true]:bg-violet-100 data-[active=true]:text-violet-800"
                >
                  <Tag className="group-hover/btn:scale-110 transition-transform text-violet-500/80 group-hover/btn:text-violet-600 group-data-[active=true]:text-violet-700" />
                  <span className="font-medium">Marcas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("suppliers")}
                  isActive={activeTab === "suppliers"}
                  tooltip="Proveedores"
                  className="group/btn hover:bg-violet-50 hover:text-violet-700 transition-all duration-200 ease-in-out data-[active=true]:bg-violet-100 data-[active=true]:text-violet-800"
                >
                  <Users className="group-hover/btn:scale-110 transition-transform text-violet-500/80 group-hover/btn:text-violet-600 group-data-[active=true]:text-violet-700" />
                  <span className="font-medium">Proveedores</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("precios")}
                  isActive={activeTab === "precios"}
                  tooltip="Precios a Publicar"
                  className="group/btn hover:bg-violet-50 hover:text-violet-700 transition-all duration-200 ease-in-out data-[active=true]:bg-violet-100 data-[active=true]:text-violet-800"
                >
                  <DollarSign className="group-hover/btn:scale-110 transition-transform text-violet-500/80 group-hover/btn:text-violet-600 group-data-[active=true]:text-violet-700" />
                  <span className="font-medium">Precios a Publicar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("zentor")}
                  isActive={activeTab === "zentor"}
                  tooltip="Lista ZENTOR"
                  className="group/btn hover:bg-violet-50 hover:text-violet-700 transition-all duration-200 ease-in-out data-[active=true]:bg-violet-100 data-[active=true]:text-violet-800"
                >
                  <Package className="group-hover/btn:scale-110 transition-transform text-violet-500/80 group-hover/btn:text-violet-600 group-data-[active=true]:text-violet-700" />
                  <span className="font-medium">Lista ZENTOR</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-emerald-600 font-bold uppercase tracking-wider text-[10px] mb-1">Ventas y Gastos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={activeTab === "rentabilidad"}
                  tooltip="Rentabilidad Real"
                  className="group/btn hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 ease-in-out data-[active=true]:bg-emerald-100 data-[active=true]:text-emerald-800"
                >
                  <a href="/dashboard/rentabilidad">
                    <TrendingUp className="group-hover/btn:scale-110 transition-transform text-emerald-500/80 group-hover/btn:text-emerald-600 group-data-[active=true]:text-emerald-700" />
                    <span className="font-medium">Rentabilidad Real</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("wholesale")}
                  isActive={activeTab === "wholesale"}
                  tooltip="Mayoristas"
                  className="group/btn hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 ease-in-out data-[active=true]:bg-purple-100 data-[active=true]:text-purple-800"
                >
                  <ShoppingCart className="group-hover/btn:scale-110 transition-transform text-purple-500/80 group-hover/btn:text-purple-600 group-data-[active=true]:text-purple-700" />
                  <span className="font-medium">Mayoristas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("retail")}
                  isActive={activeTab === "retail"}
                  tooltip="Minoristas"
                  className="group/btn hover:bg-green-50 hover:text-green-700 transition-all duration-200 ease-in-out data-[active=true]:bg-green-100 data-[active=true]:text-green-800"
                >
                  <ShoppingBag className="group-hover/btn:scale-110 transition-transform text-green-500/80 group-hover/btn:text-green-600 group-data-[active=true]:text-green-700" />
                  <span className="font-medium">Minoristas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => handleNavigation("gastos")}
                  isActive={activeTab === "gastos"}
                  tooltip="Gastos"
                  className="group/btn hover:bg-teal-50 hover:text-teal-700 transition-all duration-200 ease-in-out data-[active=true]:bg-teal-100 data-[active=true]:text-teal-800"
                >
                  <Receipt className="group-hover/btn:scale-110 transition-transform text-teal-500/80 group-hover/btn:text-teal-600 group-data-[active=true]:text-teal-700" />
                  <span className="font-medium">Gastos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-3 py-2 text-sm rounded-md bg-sidebar-accent/50 text-sidebar-foreground border border-sidebar-border/50 shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:gap-0">
              <div className="bg-primary/10 p-1 rounded-full text-primary shrink-0">
                <UserCircle className="size-5" />
              </div>
              <span className="truncate font-medium group-data-[collapsible=icon]:hidden">{userEmail || "Usuario"}</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={onLogout} 
              tooltip="Cerrar Sesión"
              className="group/logout text-red-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all duration-200"
            >
              <LogOut className="group-hover/logout:rotate-180 transition-transform duration-500" />
              <span className="font-medium">Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
