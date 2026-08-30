import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

// Mecanismo oficial de fontes do Next.js (self-hosted, sem @import externo
// bloqueando o primeiro render). Substituem, na landing, o @import que
// vivia dentro de app/page.tsx. Pesos/estilos escolhidos pra cobrir os
// mesmos usos que a página já fazia (títulos/itálico editorial em
// Cormorant, corpo/UI em DM Sans).
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "INK SYSTEM",
  description: "CRM para profissionais que atendem cliente presencial",
  icons: {
    icon: [{ url: "/logo-ink-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${cormorant.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
