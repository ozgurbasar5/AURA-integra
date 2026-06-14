export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json({
    content: 'Sistem şu an bakım aşamasındadır. Daha sonra tekrar deneyiniz.',
    result: 'Sistem şu an bakım aşamasındadır. Daha sonra tekrar deneyiniz.',
  })
}