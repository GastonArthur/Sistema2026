"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Wifi, WifiOff } from "lucide-react"

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    // Add event listeners
    const handleOnline = () => {
      setIsOnline(true)
      setShowBanner(true)
      setTimeout(() => setShowBanner(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!showBanner && isOnline) return null

  return (
    <div
      className={`w-full py-2 px-4 text-center text-sm font-medium transition-colors duration-300 ${
        isOnline ? "bg-green-500 text-white" : "bg-red-500 text-white"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        <span>
          {isOnline
            ? "Conexión restaurada. Estás en línea."
            : "Sin conexión a internet. Trabajando en modo offline."}
        </span>
      </div>
    </div>
  )
}
