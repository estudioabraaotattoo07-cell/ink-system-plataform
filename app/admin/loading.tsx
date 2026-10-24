export default function AdminLoading() {
  return (
    <main style={{ minHeight: "100vh", padding: "28px 24px", background: "#070707", color: "#E8E1D6" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ height: 18, width: 180, borderRadius: 999, background: "#24211D", marginBottom: 26 }} />
        <div style={{ height: 42, width: "100%", borderRadius: 10, background: "#151311", marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 14 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} style={{ minHeight: 180, borderRadius: 12, background: "#12100F", border: "1px solid #29231D" }} />
          ))}
        </div>
      </div>
    </main>
  );
}