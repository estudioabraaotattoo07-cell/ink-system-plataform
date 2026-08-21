const CODIGOS_REGUA = {
  avaliacaoTeste: "TESTE_02",
  testeTerminaAmanha: "TESTE_03",
  testeEncerrado: "TESTE_04",
  dadosPreservados: "TESTE_05",
  avisoExclusao: "TESTE_06",
  pesquisa30Dias: "ASSINATURA_05",
  pesquisa90Dias: "ASSINATURA_06",
  pesquisaSemestral: "ASSINATURA_07",
} as const;

export type CodigoReguaComercial = (typeof CODIGOS_REGUA)[keyof typeof CODIGOS_REGUA];

export type MarcoComercial = {
  codigo: CodigoReguaComercial;
  agendadoEm: string;
  idempotencyKey: string;
};

type JornadaParaRegua = {
  contaId: string;
  etapa: string;
  testeTerminaEm?: string | null;
  assinaturaAtivaEm?: string | null;
};

function somarDias(data: string, dias: number) {
  const resultado = new Date(data);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

function asNoveDeBrasilia(data: Date) {
  // 09:00 em Brasília corresponde a 12:00 UTC enquanto o produto operar em UTC-3.
  data.setUTCHours(12, 0, 0, 0);
  return data.toISOString();
}

function marco(contaId: string, codigo: CodigoReguaComercial, data: Date): MarcoComercial {
  const agendadoEm = asNoveDeBrasilia(data);
  return {
    codigo,
    agendadoEm,
    idempotencyKey: `${contaId}:${codigo}:${agendadoEm.slice(0, 10)}`,
  };
}

export function montarReguaComercial(jornada: JornadaParaRegua, agora = new Date()): MarcoComercial[] {
  const marcos: MarcoComercial[] = [];
  const etapasComReguaDeTeste = new Set(["teste_ativo", "avaliacao_solicitada", "teste_encerrado"]);

  if (jornada.testeTerminaEm && etapasComReguaDeTeste.has(jornada.etapa)) {
    const fim = jornada.testeTerminaEm;
    marcos.push(
      marco(jornada.contaId, CODIGOS_REGUA.avaliacaoTeste, somarDias(fim, -3)),
      marco(jornada.contaId, CODIGOS_REGUA.testeTerminaAmanha, somarDias(fim, -1)),
      marco(jornada.contaId, CODIGOS_REGUA.testeEncerrado, somarDias(fim, 0)),
      marco(jornada.contaId, CODIGOS_REGUA.dadosPreservados, somarDias(fim, 5)),
      marco(jornada.contaId, CODIGOS_REGUA.avisoExclusao, somarDias(fim, 25)),
    );
  }

  if (jornada.etapa === "assinatura_ativa" && jornada.assinaturaAtivaEm) {
    const inicio = jornada.assinaturaAtivaEm;
    marcos.push(
      marco(jornada.contaId, CODIGOS_REGUA.pesquisa30Dias, somarDias(inicio, 30)),
      marco(jornada.contaId, CODIGOS_REGUA.pesquisa90Dias, somarDias(inicio, 90)),
    );

    const diasDesdeAtivacao = Math.max(0, Math.floor((agora.getTime() - new Date(inicio).getTime()) / 86_400_000));
    const ciclosSemestrais = Math.floor(diasDesdeAtivacao / 180);
    for (let ciclo = 1; ciclo <= ciclosSemestrais + 1; ciclo += 1) {
      marcos.push(marco(jornada.contaId, CODIGOS_REGUA.pesquisaSemestral, somarDias(inicio, ciclo * 180)));
    }
  }

  return marcos;
}
