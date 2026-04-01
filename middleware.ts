import { NextResponse, type NextRequest } from 'next/server'

// Minimal pass-through middleware - auth is handled in page components via requireAuth/requireRole
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
