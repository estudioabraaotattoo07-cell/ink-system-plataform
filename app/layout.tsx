import type { Metadata } from "next";
import "./globals.css";

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
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
