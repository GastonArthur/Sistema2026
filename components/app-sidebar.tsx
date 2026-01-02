"use client"

import {
  Package,
  BarChart3,
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
  ChevronRight,
  ChevronLeft
} from "lucide-react"
import Link from "next/link"
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
  SidebarTrigger,
  useSidebar,
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

  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

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
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-16 border-b border-zinc-700/50 px-4 bg-zinc-900 relative">
        <div className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shrink-0">
            <Package className="size-5 text-zinc-900" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight leading-none text-white group-data-[collapsible=icon]:hidden">
            Sistema2026
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-800 transition-colors z-50"
          aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="size-3.5" strokeWidth={2.5} />
          ) : (
            <ChevronLeft className="size-3.5" strokeWidth={2.5} />
          )}
        </button>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4 bg-zinc-900">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "inventory"}
                  onClick={() => handleNavigation("inventory")}
                  tooltip="Dashboard"
                  className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                >
                  <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                    <BarChart3 className="size-5" strokeWidth={2} />
                  </div>
                  <span className="text-sm font-medium tracking-tight">Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "import"}
                  onClick={() => handleNavigation("import")}
                  tooltip="Productos"
                  className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                >
                  <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                    <Package className="size-5" strokeWidth={2} />
                  </div>
                  <span className="text-sm font-medium tracking-tight">Productos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <button
                  className="w-full flex items-center gap-2 h-10 px-3 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                  onClick={() => setCatalogosOpen((v) => !v)}
                >
                  {catalogosOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="text-xs font-semibold uppercase tracking-wide">Monitoreo de precios</span>
                </button>
              </SidebarMenuItem>
              {catalogosOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("precios")}
                      isActive={activeTab === "precios"}
                      tooltip="Precios a Publicar"
                      className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                        <DollarSign className="size-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium tracking-tight">Precios a Publicar</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("zentor")}
                      isActive={activeTab === "zentor"}
                      tooltip="Lista ZENTOR"
                      className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                        <Package className="size-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium tracking-tight">Lista ZENTOR</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <button
                  className="w-full flex items-center gap-2 h-10 px-3 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                  onClick={() => setGestionOpen((v) => !v)}
                >
                  {gestionOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="text-xs font-semibold uppercase tracking-wide">Configuración</span>
                </button>
              </SidebarMenuItem>
              {gestionOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("clients")}
                      isActive={activeTab === "clients"}
                      tooltip="Clientes"
                      className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                        <Users className="size-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium tracking-tight">Clientes</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("brands")}
                      isActive={activeTab === "brands"}
                      tooltip="Marcas"
                      className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                        <Tag className="size-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium tracking-tight">Marcas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("suppliers")}
                      isActive={activeTab === "suppliers"}
                      tooltip="Proveedores"
                      className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                        <Users className="size-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium tracking-tight">Proveedores</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <button
                  className="w-full flex items-center gap-2 h-10 px-3 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                  onClick={() => setVentasOpen((v) => !v)}
                >
                  {ventasOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="text-xs font-semibold uppercase tracking-wide">Ventas</span>
                </button>
              </SidebarMenuItem>
              {ventasOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("wholesale")}
                      isActive={activeTab === "wholesale"}
                      tooltip="Mayoristas"
                      className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                        <ShoppingCart className="size-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium tracking-tight">Mayoristas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("wholesale-bullpadel")}
                      isActive={activeTab === "wholesale-bullpadel"}
                      tooltip="Mayoristas Bullpadel"
                      className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                        <ShoppingCart className="size-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium tracking-tight">Mayoristas Bullpadel</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("retail")}
                      isActive={activeTab === "retail"}
                      tooltip="Minoristas"
                      className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                        <ShoppingBag className="size-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium tracking-tight">Minoristas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              <SidebarMenuItem>
                <button
                  className="w-full flex items-center gap-2 h-10 px-3 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                  onClick={() => setFinanzasOpen((v) => !v)}
                >
                  {finanzasOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="text-xs font-semibold uppercase tracking-wide">Finanzas</span>
                </button>
              </SidebarMenuItem>
              {finanzasOpen && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "rentabilidad"}
                      tooltip="Rentabilidad Real"
                      className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <Link href="/dashboard/rentabilidad" className="flex items-center gap-2 w-full">
                        <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                          <TrendingUp className="size-5" strokeWidth={2} />
                        </div>
                        <span className="text-sm font-medium tracking-tight">Rentabilidad Real</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("gastos")}
                      isActive={activeTab === "gastos"}
                      tooltip="Gastos"
                      className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                        <Receipt className="size-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium tracking-tight">Gastos</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleNavigation("notas-credito")}
                      isActive={activeTab === "notas-credito"}
                      tooltip="Notas de Crédito"
                      className="h-11 px-3 rounded-xl text-zinc-200 border border-zinc-700/40 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white data-[active=true]:bg-zinc-800 data-[active=true]:text-white transition-colors relative group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                    >
                      <div className="bg-white text-zinc-900 p-1 rounded-lg shrink-0">
                        <FileText className="size-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium tracking-tight">Notas de Crédito</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-zinc-700/50 p-3 bg-zinc-900">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg bg-zinc-800 text-white border border-zinc-700/50 shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:gap-0">
              <div className="bg-white text-zinc-900 p-1 rounded shrink-0">
                <UserCircle className="size-5" />
              </div>
              <span className="truncate font-medium group-data-[collapsible=icon]:hidden">{userEmail || "Usuario"}</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip="Cerrar Sesión"
              className="group/logout text-red-500 hover:text-red-600 hover:bg-red-500/10 hover:border-red-200 border border-transparent rounded-lg transition-all duration-200"
            >
              <LogOut className="group-hover/logout:rotate-180 transition-transform duration-500" />
              <span className="font-medium">Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
