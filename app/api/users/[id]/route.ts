import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = req.cookies.get('session')?.value
  if (!token)
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    )
  const body = await req.json()
  const upstream = await fetch(`${API_URL}/api/v1/users/${params.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = req.cookies.get('session')?.value
  if (!token)
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    )
  const upstream = await fetch(`${API_URL}/api/v1/users/${params.id}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  })
  if (upstream.status === 204) return new NextResponse(null, { status: 204 })
  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}
