import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const headers: Record<string, string | null> = {}
  req.headers.forEach((v, k) => (headers[k] = v))
  const raw = await req.text()
  console.log('[stripe webhook test] headers:', headers)
  console.log('[stripe webhook test] body length:', raw?.length)
  // Don't log body content in production; this is development-only to verify forwarding.
  return NextResponse.json({ received: true })
}
