import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Rol bazlı izin haritası
// Her route prefix için hangi roller erişebilir
const ROLE_ROUTES: Record<string, string[]> = {
  "/epanel/ayarlar":       ["admin"],
  "/epanel/yonetim":       ["admin"],
  "/epanel/finans":        ["admin", "satis"],
  "/epanel/satis":         ["admin", "satis"],
  "/epanel/magaza":        ["admin", "satis"],
  "/epanel/stok":          ["admin", "satis", "depocu"],
  "/epanel/firsat-urunleri": ["admin", "satis", "depocu"],
  "/epanel/atolye":        ["admin", "teknisyen", "stajyer"],
  "/epanel/hizli-kayit":   ["admin", "teknisyen"],
  "/epanel/ekspertiz":     ["admin", "teknisyen"],
  "/epanel/bakim-takip":   ["admin", "teknisyen"],
  "/epanel/destek":        ["admin", "teknisyen", "satis"],
  "/epanel/bayi-destek":   ["admin", "satis"],
  "/epanel/bayiler":       ["admin", "satis"],
  "/epanel/bayi-basvurulari": ["admin", "satis"],
  "/epanel/basvurular":    ["admin", "teknisyen", "satis"],
  "/epanel/kurye-yonetim": ["admin", "satis", "teknisyen"],
  "/epanel/detay":         ["admin", "teknisyen"],
  "/epanel/yazdir":        ["admin", "teknisyen"],
};

// Admin e-postaları (layout.tsx ile senkronize)
const ADMIN_EMAILS = ["admin@aurabilisim.com", "ozgurbasar5@gmail.com", "patron@aura.com"];

const SUPABASE_URL = "https://cmkjewcpqohkhnfpvoqw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNta2pld2NwcW9oa2huZnB2b3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDQ2MDIsImV4cCI6MjA4MTkyMDYwMn0.HwgnX8tn9ObFCLgStWWSSHMM7kqc9KqSZI96gpGJ6lw";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // E-panel dışı istekleri geç
  if (!pathname.startsWith("/epanel")) return NextResponse.next();

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Oturumu kontrol et
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Oturum yoksa login'e yönlendir
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const userEmail = session.user?.email || "";

  // Admin email ile giriş yapanlar her şeye erişebilir
  if (ADMIN_EMAILS.includes(userEmail)) {
    return response;
  }

  // Rolü personel_izinleri tablosundan çek
  const { data: personel } = await supabase
    .from("personel_izinleri")
    .select("rol, durum")
    .eq("email", userEmail)
    .maybeSingle();

  // Kayıt yoksa ya da pasifse → ana sayfaya
  if (!personel || personel.durum === "pasif") {
    return NextResponse.redirect(new URL("/epanel", request.url));
  }

  const userRole: string = personel.rol || "stajyer";

  // Admin rolü her şeye erişebilir
  if (userRole === "admin") return response;

  // Eşleşen en spesifik route kuralını bul
  const matchedRoute = Object.keys(ROLE_ROUTES)
    .filter((route) => pathname.startsWith(route))
    .sort((a, b) => b.length - a.length)[0]; // en uzun prefix kazanır

  // Kural varsa kontrol et
  if (matchedRoute) {
    const allowed = ROLE_ROUTES[matchedRoute];
    if (!allowed.includes(userRole)) {
      // Yetkisiz erişim → dashboard'a yönlendir
      const redirectUrl = new URL("/epanel", request.url);
      redirectUrl.searchParams.set("yetkisiz", "1");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/epanel/:path*"],
};
