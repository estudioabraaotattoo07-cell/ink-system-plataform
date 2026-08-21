// app/api/cron-disparos/route.ts
//
// Camada HTTP do Motor de Disparos — só autentica a chamada do Vercel Cron
// e traduz o resultado em resposta. A lógica de negócio mora inteira em
// lib/motor-disparos/cron-disparos.js, sem depender de Request/Response.

import { NextRequest, NextResponse } from "next/server";
import { executarMotorDisparos } from "@/lib/motor-disparos/cron-disparos.js";
import { processarFilaComercial } from "@/lib/comercial/filaComercial";

export async function GET(req: NextRequest) {
  // Vercel Cron envia GET com header authorization: "Bearer " + CRON_SECRET
  // (convenção da própria Vercel). Falha fechada por padrão: sem CRON_SECRET
  // configurado, nenhuma chamada é aceita.
  const auth = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret || auth !== "Bearer " + cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [relacionamento, operacaoCrm] = await Promise.allSettled([
    processarFilaComercial(),
    executarMotorDisparos(),
  ]);

  const relacionamentoFalhou = relacionamento.status === "rejected";
  const operacaoFalhou = operacaoCrm.status === "rejected" || (operacaoCrm.status === "fulfilled" && operacaoCrm.value.status >= 500);
  const status = relacionamentoFalhou && operacaoFalhou ? 500 : 200;

  return NextResponse.json({
    ok: status === 200,
    relacionamento: relacionamento.status === "fulfilled"
      ? relacionamento.value
      : { error: String(relacionamento.reason?.message || relacionamento.reason) },
    crm: operacaoCrm.status === "fulfilled"
      ? operacaoCrm.value.body
      : { error: String(operacaoCrm.reason?.message || operacaoCrm.reason) },
  }, { status });
}
