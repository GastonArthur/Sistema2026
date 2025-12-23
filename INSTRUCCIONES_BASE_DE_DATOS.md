# Instrucciones de Configuración de Base de Datos Supabase

Para que el sistema funcione correctamente con todas las funcionalidades automáticas (historial de precios, pedidos mayoristas, logs de actividad, etc.), es necesario ejecutar el script de configuración en su base de datos Supabase.

## Pasos para ejecutar el script SQL:

1.  **Inicie sesión en Supabase:**
    Vaya a [https://supabase.com/dashboard](https://supabase.com/dashboard) y seleccione su proyecto.

2.  **Abra el Editor SQL:**
    En el menú lateral izquierdo, haga clic en el icono "SQL Editor" (parece una terminal >_).

3.  **Cree una nueva consulta:**
    Haga clic en "+ New Query".

4.  **Copie el script de configuración:**
    Abra el archivo `scripts/complete_supabase_setup.sql` que se encuentra en este proyecto.
    Copie TODO el contenido del archivo.

5.  **Ejecute el script:**
    Pegue el contenido en el editor SQL de Supabase y haga clic en el botón "Run" (abajo a la derecha).

## ¿Qué hace este script?

*   **Crea todas las tablas necesarias:** Inventario, Proveedores, Marcas, Clientes Mayoristas, Pedidos, Gastos, Historial de Precios, Logs de Actividad.
*   **Configura funciones automáticas:** Actualización de fechas, limpieza de sesiones.
*   **Carga datos de ejemplo:** Crea un usuario administrador, categorías de gastos y proveedores básicos.

## Credenciales

Asegúrese de que su archivo `.env.local` tenga las credenciales correctas de su proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=su_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=su_clave_anonima_de_supabase
```

Una vez ejecutado el script, el sistema estará completamente operativo con todas las funcionalidades solicitadas.
