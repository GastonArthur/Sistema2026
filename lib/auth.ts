import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { compare } from "bcryptjs"
import { logError } from "@/lib/logger"

export type User = {
  id: number
  email: string
  name: string
  role: "admin" | "user" | "viewer"
  is_active: boolean
  can_view_logs: boolean
  can_view_wholesale: boolean
  created_at: string
}

export type ActivityLog = {
  id: number
  user_id: number | null
  user_email: string
  user_name: string
  action: string
  table_name: string | null
  record_id: number | null
  old_data: any
  new_data: any
  description: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// Usuario administrador único para modo offline
const ADMIN_USER: User = {
  id: 1,
  email: "maycam@gmail.com",
  name: "Administrador MAYCAM",
  role: "admin",
  is_active: true,
  can_view_logs: true,
  can_view_wholesale: true,
  created_at: new Date().toISOString(),
}

// Datos persistentes para modo offline
let OFFLINE_USERS: User[] = [
  {
    ...ADMIN_USER,
    can_view_wholesale: true, // Admin tiene acceso por defecto
  },
]
let OFFLINE_LOGS: ActivityLog[] = []
let OFFLINE_INVENTORY: any[] = []
let OFFLINE_SUPPLIERS: any[] = [
  { id: 1, name: "PROVEEDOR PRINCIPAL" },
  { id: 2, name: "DISTRIBUIDOR NACIONAL" },
  { id: 3, name: "IMPORTADOR DIRECTO" },
]
let OFFLINE_BRANDS: any[] = [
  { id: 1, name: "MARCA PREMIUM" },
  { id: 2, name: "MARCA ESTÁNDAR" },
  { id: 3, name: "MARCA ECONÓMICA" },
]

let currentUser: User | null = null

export const getCurrentUser = (): User | null => {
  if (!isSupabaseConfigured) {
    return currentUser || ADMIN_USER
  }
  return currentUser
}

export const login = async (
  email: string,
  password: string,
): Promise<{ success: boolean; user?: User; error?: string }> => {
  if (!isSupabaseConfigured) {
    // Modo offline - solo usuario administrador
    if (email === "maycam@gmail.com" && password === "MaycaM1123!") {
      currentUser = ADMIN_USER
      await logActivity("LOGIN", null, null, null, null, `Usuario ${ADMIN_USER.name} inició sesión`)
      return { success: true, user: ADMIN_USER }
    }

    // Verificar otros usuarios creados offline
    const passwordMap: { [key: string]: string } = {
      "maycam@gmail.com": "MaycaM1123!",
      "leticia@maycam.com": "Leti2025!",
      "camila@maycam.com": "Cami2025&",
      "hernan@maycam.com": "Hernan2025%",
      "mauro@maycam.com": "Mauro2025#",
      "gaston@maycam.com": "Gaston2025?",
      "lucas@maycam.com": "Lucas2025¡",
      "mariano@maycam.com": "Mariano2025!",
      "juan@maycam.com": "Juancito2025*",
    }

    const user = OFFLINE_USERS.find((u) => u.email === email && u.is_active)
    const expectedPassword = passwordMap[email]

    if (user && expectedPassword && password === expectedPassword) {
      currentUser = user
      await logActivity("LOGIN", null, null, null, null, `Usuario ${user.name} inició sesión`)
      return { success: true, user }
    }

    return { success: false, error: "Credenciales inválidas" }
  }

  try {
    // Limpiar sesiones expiradas antes del login
    await supabase.from("user_sessions").delete().lt("expires_at", new Date().toISOString())

    // Verificar credenciales en base de datos con mejor rendimiento
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, name, role, is_active, can_view_logs, can_view_wholesale, created_at, password_hash")
      .eq("email", email.toLowerCase().trim())
      .eq("is_active", true)
      .maybeSingle()

    if (error || !user) {
      if (error) logError("Error fetching user:", error)
      await logActivity("LOGIN_FAILED", null, null, null, { email }, `Intento de login fallido para ${email}`)
      return { success: false, error: "Credenciales inválidas" }
    }

    // Verificar contraseña con bcrypt
    // Si el usuario tiene hash en DB, usarlo. Si no (usuarios legacy), intentar passwordMap (opcional, o forzar reset)
    let isValidPassword = false
    
    if (user.password_hash) {
      isValidPassword = await compare(password, user.password_hash)
    } else {
      // Fallback para usuarios antiguos definidos en código (si se desea mantener)
      const passwordMap: { [key: string]: string } = {
        "maycam@gmail.com": "MaycaM1123!",
        "maycamadmin@maycam.com": "maycamadmin2025!",
      }
      isValidPassword = passwordMap[email.toLowerCase()] === password
    }

    if (!isValidPassword) {
      await logActivity("LOGIN_FAILED", null, null, null, { email }, `Contraseña incorrecta para ${email}`)
      return { success: false, error: "Credenciales inválidas" }
    }

    // Limpiar sesiones anteriores del usuario
    await supabase.from("user_sessions").delete().eq("user_id", user.id)

    // Crear nueva sesión con token más seguro
    const sessionToken = generateSecureSessionToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 horas

    const { error: sessionError } = await supabase.from("user_sessions").insert([
      {
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: null, // En producción obtener IP real
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
    ])

    if (sessionError) throw sessionError

    currentUser = user
    localStorage.setItem("session_token", sessionToken)

    await logActivity("LOGIN", null, null, null, null, `Usuario ${user.name} inició sesión correctamente`)

    return { success: true, user }
  } catch (error) {
    logError("Error en login:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export const logout = async (): Promise<void> => {
  if (!isSupabaseConfigured) {
    if (currentUser) {
      await logActivity("LOGOUT", null, null, null, null, `Usuario ${currentUser.name} cerró sesión`)
    }
    currentUser = null
    return
  }

  try {
    const sessionToken = localStorage.getItem("session_token")
    if (sessionToken && currentUser) {
      // Registrar logout antes de limpiar
      await logActivity("LOGOUT", null, null, null, null, `Usuario ${currentUser.name} cerró sesión`)

      // Limpiar sesión de la base de datos
      await supabase.from("user_sessions").delete().eq("session_token", sessionToken)

      // Limpiar almacenamiento local
      localStorage.removeItem("session_token")
    }

    currentUser = null
  } catch (error) {
    logError("Error en logout:", error)
    // Limpiar localmente aunque haya error
    localStorage.removeItem("session_token")
    currentUser = null
  }
}

export const checkSession = async (): Promise<User | null> => {
  if (!isSupabaseConfigured) {
    return currentUser
  }

  try {
    const sessionToken = localStorage.getItem("session_token")
    if (!sessionToken) return null

    // Verificar sesión con mejor rendimiento
    const { data: session, error } = await supabase
      .from("user_sessions")
      .select(`
        expires_at,
        users!inner (
          id, email, name, role, is_active, can_view_logs, can_view_wholesale, created_at
        )
      `)
      .eq("session_token", sessionToken)
      .eq("users.is_active", true)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()

    if (error || !session) {
      localStorage.removeItem("session_token")
      currentUser = null
      return null
    }

    // Extender sesión automáticamente si está por expirar
    const expiresAt = new Date(session.expires_at)
    const now = new Date()
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilExpiry < 2) {
      // Si expira en menos de 2 horas
      const newExpiresAt = new Date()
      newExpiresAt.setHours(newExpiresAt.getHours() + 24)

      await supabase
        .from("user_sessions")
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq("session_token", sessionToken)
    }

    currentUser = session.users
    return session.users
  } catch (error) {
    logError("Error verificando sesión:", error)
    localStorage.removeItem("session_token")
    currentUser = null
    return null
  }
}

export const logActivity = async (
  action: string,
  tableName: string | null,
  recordId: number | null,
  oldData: any,
  newData: any,
  description: string,
): Promise<void> => {
  const user = getCurrentUser()
  if (!user) return

  const logEntry: Omit<ActivityLog, "id" | "created_at"> = {
    user_id: user.id,
    user_email: user.email,
    user_name: user.name,
    action,
    table_name: tableName,
    record_id: recordId,
    old_data: oldData ? JSON.stringify(oldData).substring(0, 1000) : null, // Limitar tamaño
    new_data: newData ? JSON.stringify(newData).substring(0, 1000) : null, // Limitar tamaño
    description: description.substring(0, 500), // Limitar descripción
    ip_address: null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent?.substring(0, 200) : null,
  }

  if (!isSupabaseConfigured) {
    // Modo offline - persistir en memoria
    OFFLINE_LOGS.push({
      ...logEntry,
      id: Date.now(),
      created_at: new Date().toISOString(),
    })

    // Mantener solo los últimos 500 logs en memoria
    if (OFFLINE_LOGS.length > 500) {
      OFFLINE_LOGS = OFFLINE_LOGS.slice(-500)
    }

    console.log("📝 Log registrado (offline):", logEntry)
    return
  }

  try {
    // Insertar log de forma asíncrona sin bloquear la UI
    supabase
      .from("activity_logs")
      .insert([logEntry])
      .then(({ error }) => {
        if (error) {
          logError("Error registrando log:", error)
        } else {
          console.log("📝 Log registrado:", logEntry)
        }
      })
  } catch (error) {
    logError("Error registrando log:", error)
  }
}

export const getActivityLogs = async (limit = 100): Promise<ActivityLog[]> => {
  const currentUserData = getCurrentUser()

  if (!isSupabaseConfigured) {
    let logsToReturn = OFFLINE_LOGS.slice(-limit).reverse()

    // Si el usuario actual no es admin, filtrar logs del administrador
    if (currentUserData?.role !== "admin") {
      logsToReturn = logsToReturn.filter((log) => log.user_email !== "maycam@gmail.com")
    }

    return logsToReturn
  }

  try {
    let query = supabase
      .from("activity_logs")
      .select("id, user_id, user_email, user_name, action, table_name, record_id, description, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 500)) // Limitar para mejor rendimiento

    // Si el usuario actual no es admin, excluir logs del administrador
    if (currentUserData?.role !== "admin") {
      query = query.neq("user_email", "maycam@gmail.com")
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    logError("Error obteniendo logs:", error)
    return []
  }
}

export const clearAllLogs = async (): Promise<{ success: boolean; error?: string }> => {
  const user = getCurrentUser()
  if (user?.role !== "admin") {
    return { success: false, error: "No tiene permisos para realizar esta acción" }
  }

  if (!isSupabaseConfigured) {
    OFFLINE_LOGS = []
    await logActivity("CLEAR_LOGS", null, null, null, null, "Todos los logs han sido eliminados")
    return { success: true }
  }

  try {
    // Eliminar todos los logs (usando una condición que siempre sea verdadera)
    const { error } = await supabase.from("activity_logs").delete().gt("id", -1)
    
    if (error) throw error
    
    // Registrar esta acción (será el primer nuevo log)
    await logActivity("CLEAR_LOGS", null, null, null, null, "Todos los logs han sido eliminados")
    
    return { success: true }
  } catch (error) {
    logError("Error eliminando logs:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export const getUsers = async (): Promise<User[]> => {
  if (!isSupabaseConfigured) {
    return [...OFFLINE_USERS]
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, role, is_active, can_view_logs, can_view_wholesale, created_at")
      .order("name")

    if (error) throw error
    return data || []
  } catch (error) {
    logError("Error obteniendo usuarios:", error)
    return []
  }
}

export const createUser = async (userData: {
  email: string
  name: string
  password: string
  role: "admin" | "user" | "viewer"
  can_view_logs?: boolean
  can_view_wholesale?: boolean
}): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured) {
    // Verificar si el email ya existe
    if (OFFLINE_USERS.find((u) => u.email === userData.email)) {
      return { success: false, error: "El email ya está registrado" }
    }

    const newUser: User = {
      id: Date.now(),
      email: userData.email,
      name: userData.name,
      role: userData.role,
      is_active: true,
      can_view_logs: userData.can_view_logs ?? userData.role === "admin",
      can_view_wholesale: userData.can_view_wholesale ?? userData.role === "admin",
      created_at: new Date().toISOString(),
    }
    OFFLINE_USERS.push(newUser)
    await logActivity("CREATE_USER", "users", newUser.id, null, newUser, `Usuario ${newUser.name} creado`)
    return { success: true }
  }

  try {
    // Hash de la contraseña (en producción usar bcrypt real)
    const passwordHash = "$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6" // maycamadmin2025!

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email: userData.email,
          name: userData.name,
          password_hash: passwordHash,
          role: userData.role,
          can_view_logs: userData.can_view_logs ?? userData.role === "admin",
          can_view_wholesale: userData.can_view_wholesale ?? userData.role === "admin",
          created_by: getCurrentUser()?.id,
        },
      ])
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "El email ya está registrado" }
      }
      throw error
    }

    await logActivity("CREATE_USER", "users", data.id, null, data, `Usuario ${data.name} creado`)
    return { success: true }
  } catch (error) {
    logError("Error creando usuario:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export const updateUser = async (
  userId: number,
  updates: Partial<User>,
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured) {
    const userIndex = OFFLINE_USERS.findIndex((u) => u.id === userId)
    if (userIndex === -1) {
      return { success: false, error: "Usuario no encontrado" }
    }

    const oldUser = { ...OFFLINE_USERS[userIndex] }
    OFFLINE_USERS[userIndex] = { ...OFFLINE_USERS[userIndex], ...updates }

    await logActivity(
      "UPDATE_USER",
      "users",
      userId,
      oldUser,
      OFFLINE_USERS[userIndex],
      `Usuario ${OFFLINE_USERS[userIndex].name} actualizado`,
    )
    return { success: true }
  }

  try {
    const oldUser = await supabase.from("users").select("*").eq("id", userId).single()

    const { error } = await supabase
      .from("users")
      .update({
        name: updates.name,
        email: updates.email,
        role: updates.role,
        is_active: updates.is_active,
        can_view_logs: updates.can_view_logs,
        can_view_wholesale: updates.can_view_wholesale,
        updated_by: getCurrentUser()?.id,
      })
      .eq("id", userId)

    if (error) throw error

    const newUser = await supabase.from("users").select("*").eq("id", userId).single()

    await logActivity(
      "UPDATE_USER",
      "users",
      userId,
      oldUser.data,
      newUser.data,
      `Usuario ${updates.name || oldUser.data?.name} actualizado`,
    )

    return { success: true }
  } catch (error) {
    logError("Error actualizando usuario:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export const deleteUser = async (userId: number): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured) {
    const userIndex = OFFLINE_USERS.findIndex((u) => u.id === userId)
    if (userIndex === -1) {
      return { success: false, error: "Usuario no encontrado" }
    }

    // No permitir eliminar al administrador principal
    if (OFFLINE_USERS[userIndex].email === "maycam@gmail.com") {
      return { success: false, error: "No se puede eliminar el administrador principal" }
    }

    const deletedUser = OFFLINE_USERS[userIndex]
    OFFLINE_USERS.splice(userIndex, 1)

    await logActivity("DELETE_USER", "users", userId, deletedUser, null, `Usuario ${deletedUser.name} eliminado`)
    return { success: true }
  }

  try {
    const userToDelete = await supabase.from("users").select("*").eq("id", userId).single()

    // No permitir eliminar al administrador principal
    if (userToDelete.data?.email === "maycam@gmail.com") {
      return { success: false, error: "No se puede eliminar el administrador principal" }
    }

    const { error } = await supabase.from("users").delete().eq("id", userId)

    if (error) throw error

    await logActivity(
      "DELETE_USER",
      "users",
      userId,
      userToDelete.data,
      null,
      `Usuario ${userToDelete.data?.name} eliminado`,
    )

    return { success: true }
  } catch (error) {
    logError("Error eliminando usuario:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export const clearLogs = async (): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured) {
    OFFLINE_LOGS = []
    // Crear un nuevo log indicando que se limpiaron
    await logActivity("CLEAR_LOGS", "activity_logs", null, null, null, "Logs del sistema limpiados")
    return { success: true }
  }

  try {
    const { error } = await supabase.from("activity_logs").delete().neq("id", -1)

    if (error) throw error

    await logActivity("CLEAR_LOGS", "activity_logs", null, null, null, "Logs del sistema limpiados")

    return { success: true }
  } catch (error) {
    logError("Error limpiando logs:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export const hasPermission = (action: string): boolean => {
  const user = getCurrentUser()
  if (!user) return false

  // Verificar permisos específicos para logs
  if (action === "VIEW_LOGS") {
    return user.can_view_logs
  }

  // Verificar permisos específicos para mayoristas
  if (action === "VIEW_WHOLESALE") {
    return user.can_view_wholesale || false
  }

  switch (user.role) {
    case "admin":
      return true
    case "user":
      return !["DELETE_USER", "CREATE_USER", "EDIT_USER", "UPDATE_USER"].includes(action)
    case "viewer":
      return ["VIEW", "EXPORT"].includes(action)
    default:
      return false
  }
}

const generateSessionToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

const generateSecureSessionToken = (): string => {
  const array = new Uint8Array(32)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }
  // Fallback para entornos sin crypto
  return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2)
}

// Funciones para persistir datos offline
export const getOfflineData = () => ({
  users: OFFLINE_USERS,
  logs: OFFLINE_LOGS,
  inventory: OFFLINE_INVENTORY,
  suppliers: OFFLINE_SUPPLIERS,
  brands: OFFLINE_BRANDS,
})

export const setOfflineData = (data: any) => {
  if (data.users) OFFLINE_USERS = data.users
  if (data.logs) OFFLINE_LOGS = data.logs
  if (data.inventory) OFFLINE_INVENTORY = data.inventory
  if (data.suppliers) OFFLINE_SUPPLIERS = data.suppliers
  if (data.brands) OFFLINE_BRANDS = data.brands
}

export const isSystemInitialized = async (): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    // En modo offline, verificar si hay usuarios además del admin por defecto
    return OFFLINE_USERS.length > 1 || localStorage.getItem("system_initialized") === "true"
  }

  try {
    const { data, error } = await supabase.from("users").select("id").limit(1)

    if (error) throw error
    return data && data.length > 0
  } catch (error) {
    logError("Error verificando inicialización:", error)
    return false
  }
}

export const initializeSystem = async (adminData: {
  name: string
  email: string
  password: string
}): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured) {
    // Modo offline - reemplazar el admin por defecto
    OFFLINE_USERS = [
      {
        id: 1,
        email: adminData.email,
        name: adminData.name,
        role: "admin",
        is_active: true,
        can_view_logs: true,
        can_view_wholesale: true,
        created_at: new Date().toISOString(),
      },
    ]
    localStorage.setItem("system_initialized", "true")
    return { success: true }
  }

  try {
    // Hash de la contraseña (en producción usar bcrypt real)
    const passwordHash = "$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6"

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email: adminData.email,
          name: adminData.name,
          password_hash: passwordHash,
          role: "admin",
          can_view_logs: true,
          can_view_wholesale: true,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "El email ya está registrado" }
      }
      throw error
    }

    return { success: true }
  } catch (error) {
    logError("Error inicializando sistema:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}
