import type { Metadata } from 'next'
import './globals.css'
import { OfflineBanner } from '@/components/offline-banner'

export const metadata: Metadata = {
  title: 'Maycam Inventory',
  description: 'Sistema de Gestión de Inventario',
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
      </body>
    </html>
  )
}
