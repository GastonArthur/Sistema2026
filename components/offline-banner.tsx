"use client"

import { AlertTriangle } from "lucide-react"
import { isSupabaseConfigured } from "@/lib/supabase"
import { useEffect, useState } from "react"

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!isSupabaseConfigured)
  }, [])

  if (!isOffline) return null

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium sticky top-0 z-50 shadow-md">
      <AlertTriangle className="w-4 h-4" />
      <span>
        MODO OFFLINE: Los cambios no se guardarán permanentemente. Configura Supabase en .env.local para activar el guardado.
      </span>
    </div>
  )
}
