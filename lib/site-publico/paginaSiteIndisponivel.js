// Fallback do site público do tenant (site inexistente, despublicado ou tenant
// inativo) — Bloco 4.1.
//
// Decisão autorizada nesta implementação: NÃO importar PAGE_STYLE/PAGE_LOGO de
// inq-saas/api/lead.js (linhas 14-29), porque esse bloco de estilo pertence a
// fluxos transacionais sem relação com o site (confirmação de presença,
// avaliação NPS, resposta ao Google) — arrastar isso pra cá acoplaria este
// projeto a um CSS genérico de outro domínio de produto. Em vez disso, esta
// função tem um estilo próprio, autocontido, mantendo o mesmo propósito e tom
// visual (fundo escuro, acento dourado) da página original.
export function paginaSiteIndisponivel() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Site indisponível</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;background:#0A0A0A;color:#E8E2D9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:linear-gradient(180deg,#1A1A1A,#0F0F0F);border:1.5px solid rgba(201,168,76,0.4);border-radius:20px;max-width:460px;width:100%;padding:40px 32px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,0.75)}
.icon{font-size:48px;margin-bottom:16px}
h1{font-size:20px;font-weight:normal;color:#E8E2D9;line-height:1.5}
.footer{font-size:11px;color:#4a4235;margin-top:28px;letter-spacing:.05em;text-transform:uppercase}
</style>
</head>
<body>
<div class="card">
  <div class="icon">🖤</div>
  <h1>Este site não está disponível no momento.</h1>
  <div class="footer">Powered by INK SYSTEM</div>
</div>
</body>
</html>`;
}
