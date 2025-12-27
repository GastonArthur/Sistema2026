"use client"

import React, { useState, useEffect } from "react"
import { checkSession } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShieldCheck, Lock, Smartphone, CheckCircle, Copy, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export default function SecurityPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // 2FA Setup State
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [secret, setSecret] = useState("")
  const [otpAuth, setOtpAuth] = useState("")
  const [code, setCode] = useState("")
  const [verifyLoading, setVerifyLoading] = useState(false)

  // Sidebar State (Dummy)
  const [sidebarActiveTab, setSidebarActiveTab] = useState("")
  
  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const userData = await checkSession()
    setUser(userData)
    setLoading(false)
  }

  const startSetup = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/auth/2fa/generate", { method: "POST" })
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      setSecret(data.secret)
      setOtpAuth(data.otpauth)
      setIsSettingUp(true)
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message || "Error al iniciar configuración", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    if (code.length !== 6) return

    try {
      setVerifyLoading(true)
      const res = await fetch("/api/auth/2fa/enable", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, code })
      })
      
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      toast({ 
        title: "¡2FA Activado!", 
        description: "Tu cuenta ahora es más segura.", 
      })
      
      setIsSettingUp(false)
      setSecret("")
      setOtpAuth("")
      setCode("")
      
      // Refresh user data
      // We need to manually update local user state or force reload
      // Ideally we would update the session on the server side too? 
      // checkSession fetches from DB so it should be fine
      await loadUser()
      
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message || "Código inválido", 
        variant: "destructive" 
      })
    } finally {
      setVerifyLoading(false)
    }
  }

  const disable2FA = async () => {
    if (!confirm("¿Estás seguro de que quieres desactivar la autenticación de dos pasos? Tu cuenta será menos segura.")) return

    try {
      setLoading(true)
      const res = await fetch("/api/auth/2fa/disable", { method: "POST" })
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      toast({ 
        title: "2FA Desactivado", 
        description: "La autenticación de dos pasos ha sido desactivada.", 
      })
      
      await loadUser()
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message || "Error al desactivar", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    toast({ description: "Código secreto copiado al portapapeles" })
  }

  if (loading && !user) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>
  }

  return (
    <SidebarProvider>
      <AppSidebar 
        activeTab={sidebarActiveTab}
        setActiveTab={() => {}}
        setShowWholesale={() => {}}
        setShowRetail={() => {}}
        setShowGastos={() => {}}
        setShowClients={() => {}}
        onLogout={() => window.location.href = "/"} 
        userEmail={user?.email} 
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-5 w-5" />
            Seguridad de la Cuenta
          </div>
        </header>
        
        <div className="flex-1 p-8 pt-6 max-w-4xl mx-auto w-full">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Autenticación de Dos Pasos (2FA)</h2>
              <p className="text-muted-foreground">
                Añade una capa extra de seguridad a tu cuenta requiriendo un código de tu teléfono al iniciar sesión.
              </p>
            </div>

            {user?.two_factor_enabled ? (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <CardTitle className="text-green-800">2FA está activado</CardTitle>
                  </div>
                  <CardDescription className="text-green-700">
                    Tu cuenta está protegida. Cada vez que inicies sesión, se te pedirá un código de verificación.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-green-800 bg-white/50 p-4 rounded-lg border border-green-100">
                    <Smartphone className="h-5 w-5" />
                    <span>Usando aplicación autenticadora (Google Authenticator, Authy, etc.)</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="destructive" onClick={disable2FA} disabled={loading}>
                    Desactivar 2FA
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Configurar 2FA</CardTitle>
                  <CardDescription>
                    Protege tu cuenta contra accesos no autorizados.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isSettingUp ? (
                    <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
                      <div className="p-4 bg-slate-100 rounded-full">
                        <Lock className="h-8 w-8 text-slate-600" />
                      </div>
                      <div className="max-w-md space-y-2">
                        <h3 className="font-semibold text-lg">Protege tu cuenta</h3>
                        <p className="text-sm text-muted-foreground">
                          La autenticación de dos factores añade una capa adicional de seguridad. 
                          Necesitarás una aplicación como Google Authenticator o Microsoft Authenticator.
                        </p>
                      </div>
                      <Button onClick={startSetup} disabled={loading}>
                        Comenzar Configuración
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Step 1: QR Code */}
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 font-medium text-lg">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">1</span>
                            Escanear código QR
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Abre tu aplicación autenticadora y escanea este código QR.
                          </p>
                          <div className="border p-4 rounded-lg bg-white w-fit mx-auto md:mx-0">
                            {/* Using external API for QR generation to avoid heavy dependencies on client */}
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuth)}`} 
                              alt="QR Code" 
                              className="w-[200px] h-[200px]"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ¿No puedes escanear? Ingresa este código manualmente:
                            <div className="flex items-center gap-2 mt-1 font-mono bg-slate-100 p-2 rounded border">
                              <span className="flex-1 truncate">{secret}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copySecret}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Step 2: Verify */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 font-medium text-lg">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">2</span>
                            Verificar Código
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Ingresa el código de 6 dígitos que aparece en tu aplicación.
                          </p>
                          
                          <div className="py-4">
                            <InputOTP
                              maxLength={6}
                              value={code}
                              onChange={(value) => setCode(value)}
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                              </InputOTPGroup>
                              <div className="w-2" />
                              <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>

                          <Button 
                            onClick={verifyAndEnable} 
                            disabled={verifyLoading || code.length !== 6}
                            className="w-full"
                          >
                            {verifyLoading ? "Verificando..." : "Activar 2FA"}
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            onClick={() => setIsSettingUp(false)}
                            className="w-full"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
