export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // AI şu an bakımda/devre dışı
  return NextResponse.json({ 
    result: "Sistem şu an bakım aşamasındadır. Daha sonra tekrar deneyiniz." 
  });
}