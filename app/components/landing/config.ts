// app/components/landing/config.ts
//
// Configuração central da landing page. Nenhum componente deve
// hardcodar destino de CTA nem preço -- sempre importar daqui.
//
// Dois caminhos comerciais, dois destinos técnicos separados (decisão
// registrada nesta rodada): teste gratuito de 7 dias e assinatura direta.
// Cada constante aponta pra uma âncora dentro da própria seção de Oferta
// -- nunca para /login, /demo, checkout ou qualquer formulário real.
// Trocar cada uma, quando os Blocos futuros (cadastro, checkout)
// existirem, é o suficiente para religar os CTAs correspondentes de uma
// vez, sem tocar em cada botão individualmente.
export const CTA_DESTINO_TESTE = "#teste-gratis";
export const CTA_DESTINO_ASSINATURA = "#assinar";

// null = preço ainda não decidido. Nenhum componente deve exibir
// "R$ [VALOR]" nem qualquer outro placeholder visível -- a seção de
// oferta já sabe omitir o valor quando isto for null, e passa a exibir
// automaticamente assim que uma decisão de produto definir este valor.
// Nome sem "mensal" de propósito -- a periodicidade da assinatura também
// não foi decidida ainda, então nem o nome da constante deve presumi-la.
export const PRECO_ASSINATURA: string | null = null;
