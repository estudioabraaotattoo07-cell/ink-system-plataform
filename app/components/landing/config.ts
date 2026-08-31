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

// Preço oficial central do Ink System 1.0. Condições promocionais temporárias
// pertencem à superfície comercial que as apresenta e não substituem este valor.
export const PRECO_ASSINATURA = "R$ 157/mês";
