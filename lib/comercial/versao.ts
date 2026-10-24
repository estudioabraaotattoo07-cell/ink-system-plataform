/** Representação administrativa da versão comercial atual. */
export function versaoComercialVisivel(plano: string | null | undefined): string {
  const valor = plano?.trim().toLowerCase();
  if (valor === "1.0" || valor === "1.0-teste") return valor;
  return plano ? "Legado descontinuado" : "—";
}
