export default function ComplementarPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(139,92,222,0.35), transparent 65%), #05040A",
        color: "#E8E2D9",
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{ maxWidth: 440 }}>
        <div style={{ fontSize: 28, marginBottom: 14 }}>🛠️</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: "#C9A84C", margin: "0 0 14px" }}>
          Estamos preparando esta etapa
        </h1>
        <p style={{ color: "#A79A8A", fontSize: 14, lineHeight: 1.7 }}>
          O formulário de complementação de dados ainda está sendo construído. Em breve você receberá um e-mail
          com o link atualizado assim que ele estiver pronto.
        </p>
      </div>
    </main>
  );
}
