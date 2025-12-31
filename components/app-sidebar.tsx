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
  ShieldCheck,
  FileText,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { useState } from "react"

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
  SidebarMenuBadge,
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
    setCatalogosOpen(false)
    setGestionOpen(false)
    setVentasOpen(false)
    setFinanzasOpen(false)
  }
  const [gestionOpen, setGestionOpen] = useState(false)
  const [ventasOpen, setVentasOpen] = useState(false)
  const [finanzasOpen, setFinanzasOpen] = useState(false)
  const [catalogosOpen, setCatalogosOpen] = useState(false)

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border/50 pb-4 mb-2">
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
            {/* Trigger eliminado para cerrar desde el header */}
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
      <SidebarContent className="px-2 gap-1">
        <SidebarGroup className="p-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "inventory"}
                  onClick={() => handleNavigation("inventory")}
                  tooltip="Inventario"
                  className="group/btn hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 ease-in-out data-[active=true]:bg-blue-100 data-[active=true]:text-blue-800 rounded-md"
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
                  className="group/btn hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 ease-in-out data-[active=true]:bg-blue-100 data-[active=true]:text-blue-800 rounded-md"
                >
                  <FileSpreadsheet className="group-hover/btn:scale-110 transition-transform text-blue-500/80 group-hover/btn:text-blue-600 group-data-[active=true]:text-blue-700" />
                  <span className="font-medium">Importar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <button
                  className="w-full flex items-center gap-2 p-2 rounded-md bg-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors border border-sidebar-border"
                  onClick={() => setCatalogosOpen((v) => !v)}
                >
                  {catalogosOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sección Catálogos</span>
                </button>
              </SidebarMenuItem>
              {catalogosOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("precios")}
                      isActive={activeTab === "precios"}
                      tooltip="Precios a Publicar"
                      className="group/btn hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-sm"
                    >
                      <DollarSign className="opacity-70" />
                      <span>Precios a Publicar</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("zentor")}
                      isActive={activeTab === "zentor"}
                      tooltip="Lista ZENTOR"
                      className="group/btn hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-sm"
                    >
                      <Package className="opacity-70" />
                      <span>Lista ZENTOR</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <button
                  className="w-full flex items-center gap-2 p-2 rounded-md bg-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors border border-sidebar-border"
                  onClick={() => setGestionOpen((v) => !v)}
                >
                  {gestionOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sección Gestión</span>
                </button>
              </SidebarMenuItem>
              {gestionOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("clients")}
                      isActive={activeTab === "clients"}
                      tooltip="Clientes"
                      className="group/btn hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-sm"
                    >
                      <Users className="opacity-70" />
                      <span>Clientes</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("brands")}
                      isActive={activeTab === "brands"}
                      tooltip="Marcas"
                      className="group/btn hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-sm"
                    >
                      <Tag className="opacity-70" />
                      <span>Marcas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("suppliers")}
                      isActive={activeTab === "suppliers"}
                      tooltip="Proveedores"
                      className="group/btn hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-sm"
                    >
                      <Users className="opacity-70" />
                      <span>Proveedores</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <button
                  className="w-full flex items-center gap-2 p-2 rounded-md bg-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors border border-sidebar-border"
                  onClick={() => setVentasOpen((v) => !v)}
                >
                  {ventasOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sección Ventas</span>
                </button>
              </SidebarMenuItem>
              {ventasOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("wholesale")}
                      isActive={activeTab === "wholesale"}
                      tooltip="Mayoristas"
                      className="group/btn hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-sm"
                    >
                      <ShoppingCart className="opacity-70" />
                      <span>Mayoristas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("wholesale-bullpadel")}
                      isActive={activeTab === "wholesale-bullpadel"}
                      tooltip="Mayoristas Bullpadel"
                      className="group/btn hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-sm"
                    >
                      <ShoppingCart className="opacity-70" />
                      <span>Mayoristas Bullpadel</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("retail")}
                      isActive={activeTab === "retail"}
                      tooltip="Minoristas"
                      className="group/btn hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-sm"
                    >
                      <ShoppingBag className="opacity-70" />
                      <span>Minoristas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              <SidebarMenuItem>
                <button
                  className="w-full flex items-center gap-2 p-2 rounded-md bg-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors border border-sidebar-border"
                  onClick={() => setFinanzasOpen((v) => !v)}
                >
                  {finanzasOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sección Finanzas</span>
                </button>
              </SidebarMenuItem>
              {finanzasOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={activeTab === "rentabilidad"}
                      tooltip="Rentabilidad Real"
                      className="group/btn hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-sm"
                    >
                      <a href="/dashboard/rentabilidad">
                        <TrendingUp className="opacity-70" />
                        <span>Rentabilidad Real</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("gastos")}
                      isActive={activeTab === "gastos"}
                      tooltip="Gastos"
                      className="group/btn hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-primary rounded-sm"
                    >
                      <Receipt className="opacity-70" />
                      <span>Gastos</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("notas-credito")}
                      isActive={activeTab === "notas-credito"}
                      tooltip="Notas de Crédito"
                      className="group/btn hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-primary relative rounded-sm"
                    >
                      <FileText className="opacity-70" />
                      <span>Notas de Crédito</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
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
