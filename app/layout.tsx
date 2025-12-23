import type { Metadata } from 'next'
import './globals.css'
import { OfflineBanner } from '@/components/offline-banner'
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Sistema de Inventario',
  description: 'Sistema de gestión de inventario y ventas mayoristas',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>
        <OfflineBanner />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
