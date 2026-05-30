import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura Integra ERP | KOBİ ve Esnaflar için Yeni Nesil Yönetim",
  description: "Muhasebe, Stok Yönetimi ve Teknik Servis süreçlerinizi tek ekrandan yönetin.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        {children}
      </body>
    </html>
  );
}
