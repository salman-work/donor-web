'use server'

import { NextResponse } from 'next/server'
import { checkAuth } from '@/actions/authentication/donor'

export async function GET() {
  try {
    const result = await checkAuth()
    return NextResponse.json(result, { status: 200 })
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, authenticated: false, error: String(err) },
      { status: 500 },
    )
  }
}
