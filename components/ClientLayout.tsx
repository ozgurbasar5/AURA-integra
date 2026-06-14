"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Yönetim Paneli ve Login sayfalarında Navbar/Footer GİZLE
  // pathname null kontrolü eklendi (nadiren de olsa hata vermemesi için)
  const isPanelOrLogin = pathname?.startsWith("/epanel") || pathname === "/login";

  if (isPanelOrLogin) {
    // Paneldeyiz: Sadece içeriği (sayfayı) göster, menüleri koyma
    return <>{children}</>;
  }

  // Normal sitedeyiz: Menü, İçerik ve Footer göster
  return (
    <div className="flex flex-col min-h-screen">
      {/* Üst Bar */}
      <Navbar />
      
      {/* Sayfa İçeriği */}
      <main className="flex-1">
        {children}
      </main>

      {/* Alt Bar */}
      <Footer />
    </div>
  );
}