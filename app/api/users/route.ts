import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token)
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    )
  const { searchParams } = new URL(req.url)
  const page = searchParams.get('page') ?? '1'
  const limit = searchParams.get('limit') ?? '20'
  const upstream = await fetch(`${API_URL}/api/v1/users?page=${page}&limit=${limit}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token)
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    )
  const body = await req.json()
  const upstream = await fetch(`${API_URL}/api/v1/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}
