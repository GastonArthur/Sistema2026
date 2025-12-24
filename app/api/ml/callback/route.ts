import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
  
  if (!code) {
    return NextResponse.json({ ok: false, error: "No code provided" }, { status: 400 });
  }

  // Aquí podrías:
  // 1. Intercambiar el 'code' por un 'access_token' usando MLService.
  // 2. Guardar el token en la base de datos (rt_ml_accounts).
  // Por ahora, solo devolvemos el código para copiarlo manualmente si es necesario.
  
  return NextResponse.json({ 
    ok: true, 
    message: "Código recibido. Copia este código para configurar tu cuenta si es necesario, o implementa el intercambio automático.",
    code 
  });
}
