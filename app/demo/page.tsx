export default function DemoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 px-4">
      <div className="max-w-md text-center flex flex-col gap-4 items-center">
        <div className="text-3xl">🚧</div>
        <h1 className="text-xl font-semibold text-amber-500">Teste grátis chegando em breve</h1>
        <p className="text-sm text-neutral-400">
          Estamos preparando o ambiente de teste. Enquanto isso, fale com a gente pra saber mais.
        </p>
        <a
          href="https://wa.me/5527999598230"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium rounded-lg py-2 px-4 text-sm inline-block transition-colors"
        >
          Falar no WhatsApp
        </a>
        <a href="/" className="text-xs text-neutral-500 underline">
          Voltar
        </a>
      </div>
    </main>
  );
}
