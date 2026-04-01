import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth pages and static assets
  if (
    pathname === '/login' ||
    pathname === '/auth/update-password' ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  // Check for Supabase session cookie (works without importing Supabase client)
  const hasSession =
    request.cookies.get('sb-crbbzullmkvarpqnkcey-auth-token') ||
    request.cookies.get('sb-crbbzullmkvarpqnkcey-auth-token-code-verifier') ||
    request.cookies.has('sb-access-token')

  // Protect admin and my-applications routes
  if ((pathname.startsWith('/admin') || pathname.startsWith('/my-applications')) && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
