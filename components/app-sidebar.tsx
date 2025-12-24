"use client"

import {
  Package,
  Users,
  Tag,
  DollarSign,
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
  setShowGastos: (show: boolean) => void
  onLogout: () => void
  userEmail?: string
}

export function AppSidebar({
  activeTab,
  setActiveTab,
  setShowWholesale,
  setShowGastos,
  onLogout,
  userEmail
}: SidebarNavigationProps) {

  const handleNavigation = (tab: string) => {
    setActiveTab(tab)
    setShowWholesale(false)
    setShowGastos(false)
  }

  const handleOpenWholesale = () => {
    setShowWholesale(true)
    setShowGastos(false)
    // Optionally set active tab to something generic or keep current
  }

  const handleOpenGastos = () => {
    setShowGastos(true)
    setShowWholesale(false)
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="size-4" />
          </div>
          <div className="font-semibold text-lg">Sistema 2026</div>
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
