import type { Metadata } from 'next'
import './globals.css'
<<<<<<< HEAD
=======
import { OfflineBanner } from '@/components/offline-banner'
import { Toaster } from "@/components/ui/toaster"
>>>>>>> cfdb2897791e6610d2eeb399f41ec26d521ad4d0

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
<<<<<<< HEAD
    <html lang="en">
      <body>{children}</body>
=======
    <html lang="es">
      <body>
        <OfflineBanner />
        {children}
        <Toaster />
      </body>
>>>>>>> cfdb2897791e6610d2eeb399f41ec26d521ad4d0
    </html>
  )
}
