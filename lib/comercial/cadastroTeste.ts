export type DadosCadastroTeste = {
  nome: string;
  email: string;
  whatsapp: string;
};

export function normalizarEmail(valor: string) {
  return valor.trim().toLowerCase();
}

export function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

export function validarCadastroTeste(entrada: Partial<DadosCadastroTeste>) {
  const nome = (entrada.nome || "").trim().replace(/\s+/g, " ");
  const email = normalizarEmail(entrada.email || "");
  const whatsapp = somenteDigitos(entrada.whatsapp || "");
  const erros: Partial<Record<keyof DadosCadastroTeste, string>> = {};

  if (nome.length < 3 || nome.length > 100 || !nome.includes(" ")) {
    erros.nome = "Informe seu nome e sobrenome.";
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    erros.email = "Informe um e-mail válido.";
  }
  if (whatsapp.length < 10 || whatsapp.length > 13) {
    erros.whatsapp = "Informe um WhatsApp com DDD.";
  }

  return {
    valido: Object.keys(erros).length === 0,
    dados: { nome, email, whatsapp },
    erros,
  };
}
