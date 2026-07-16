# AURA İntegra — Expo mobil

Native kabuk: giriş, Ana / Kabul / Atölye / Satış / Sayım.

## Kurulum

```bash
cd mobile
cp .env.example .env
# EXPO_PUBLIC_SUPABASE_* değerlerini web .env.local ile aynı yapın
# EXPO_PUBLIC_API_URL = Next.js adresi (cihazdan erişilebilir)
npm start
```

Expo Go ile QR okutun veya:

```bash
npm run android
npm run web
```

Kök dizinden: `npm run mobile`

## Mimari

| Katman | Nasıl |
|--------|--------|
| Auth | `@supabase/supabase-js` + AsyncStorage |
| Kabul / Atölye | Supabase `service_orders` (RLS) |
| Satış / Sayım | Next API + `Authorization: Bearer <access_token>` |

Web API Bearer desteği: `lib/supabase/tenant-auth.ts`

## Notlar

- Next.js `npm run dev` çalışıyor olmalı (Satış/Sayım için).
- Fiziksel telefonda `localhost` çalışmaz — LAN IP kullanın.
- iOS simülatörde `localhost:3000` genelde OK.
