// app/api/cron-disparos/route.ts
//
// Camada HTTP do Motor de Disparos — só autentica a chamada do Vercel Cron
// e traduz o resultado em resposta. A lógica de negócio mora inteira em
// lib/motor-disparos/cron-disparos.js, sem depender de Request/Response.

import { NextRequest, NextResponse } from "next/server";
import { executarMotorDisparos } from "@/lib/motor-disparos/cron-disparos.js";

export async function GET(req: NextRequest) {
  // Vercel Cron envia GET com header authorization: "Bearer " + CRON_SECRET
  // (convenção da própria Vercel). Falha fechada por padrão: sem CRON_SECRET
  // configurado, nenhuma chamada é aceita.
  const auth = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret || auth !== "Bearer " + cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resultado = await executarMotorDisparos();
  return NextResponse.json(resultado.body, { status: resultado.status });
}
