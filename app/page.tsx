// Vídeo institucional — troque pelo ID real do YouTube quando estiver pronto
// (o ID é o trecho depois de "v=" na URL do vídeo).
const YOUTUBE_VIDEO_ID = "";
const WHATSAPP_SUPORTE = "https://wa.me/5527999598230";

const PLANOS = [
  { nome: "Starter", preco: "R$297", artistas: "até 2", sms: 100, storage: "1GB", assessorias: 1, destaque: false },
  { nome: "Profissional", preco: "R$497", artistas: "até 4", sms: 200, storage: "3GB", assessorias: 2, destaque: true },
  { nome: "Completo", preco: "R$597", artistas: "até 6", sms: 400, storage: "5GB", assessorias: 4, destaque: false },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="max-w-3xl mx-auto text-center px-4 pt-20 pb-12">
        <h1 className="text-4xl font-semibold text-amber-500">INK SYSTEM</h1>
        <p className="mt-4 text-neutral-400 text-lg">
          O CRM feito pra quem atende cliente presencial — tatuadores, podólogos, dentistas e mais.
        </p>
        <div className="mt-10 flex gap-4 justify-center flex-wrap">
          <a
            href="/demo"
            className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium rounded-lg px-6 py-3 text-sm transition-colors"
          >
            Experimentar grátis
          </a>
          <a
            href="/login"
            className="border border-neutral-700 hover:border-amber-500 rounded-lg px-6 py-3 text-sm text-neutral-300 transition-colors"
          >
            Já sou cliente
          </a>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="aspect-video w-full rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 flex items-center justify-center">
          {YOUTUBE_VIDEO_ID ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}`}
              title="Apresentação do INK SYSTEM"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <p className="text-neutral-500 text-sm">Vídeo de apresentação em breve</p>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-24">
        <h2 className="text-center text-2xl font-semibold text-neutral-100 mb-10">Planos</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANOS.map((p) => (
            <div
              key={p.nome}
              className={`rounded-xl border p-6 flex flex-col gap-3 ${
                p.destaque ? "border-amber-500 bg-neutral-900" : "border-neutral-800 bg-neutral-950"
              }`}
            >
              <div className="text-lg font-semibold text-amber-500">{p.nome}</div>
              <div className="text-2xl font-semibold">
                {p.preco}
                <span className="text-sm text-neutral-500 font-normal">/mês</span>
              </div>
              <ul className="text-sm text-neutral-400 flex flex-col gap-1 mt-2">
                <li>Artistas: {p.artistas}</li>
                <li>SMS/mês: {p.sms}</li>
                <li>Storage: {p.storage}</li>
                <li>Assessorias/mês: {p.assessorias}</li>
              </ul>
              <a
                href={WHATSAPP_SUPORTE}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 text-center bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium rounded-lg py-2 text-sm transition-colors"
              >
                Assinar
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
