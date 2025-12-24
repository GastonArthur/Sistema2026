import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // MercadoLibre manda distintos formatos (orders, items, questions).
  // Es CRÍTICO responder 200 OK rápidamente para evitar que ML reintente o deshabilite la notificación.
  
  try {
    const body = await req.json();
    console.log("ML Notification received:", JSON.stringify(body));
    
    // Aquí podrías procesar la notificación:
    // 1. Verificar el 'topic' (orders_v2, items, questions, etc.)
    // 2. Encolar un trabajo para sincronizar esa orden/item específico.
    //    Ej: await mlService.syncOrder(body.resource);
    
  } catch (error) {
    console.error("Error processing ML notification body:", error);
    // Aun así respondemos 200 para no romper el webhook
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  // ML a veces verifica la URL con un GET
  return NextResponse.json({ ok: true, status: "active" });
}
