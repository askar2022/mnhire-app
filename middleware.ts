import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // If env vars are missing, allow all requests through (prevents crash on misconfigured deploys)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Don't check auth for password reset page - it has its own session handling
  if (request.nextUrl.pathname === '/auth/update-password') {
    return response
  }

  // Refresh session - this is critical for server components
  const { data: { user } } = await supabase.auth.getUser()

  // If logged-in user visits /login, redirect them to the right place immediately
  // This prevents the login page flash for already-authenticated users
  if (request.nextUrl.pathname === '/login' && user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const isAdmin = ['HR', 'Admin', 'Principal', 'HiringManager',
      'AcademicDirector', 'SPEDDirector', 'OperationManager', 'AssistantPrincipal', 'ITSupport', 'ExecutiveDirector'].includes(userData?.role)
    return NextResponse.redirect(new URL(isAdmin ? '/admin/jobs' : '/my-applications', request.url))
  }

  // If user is trying to access admin routes without auth, redirect to login
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is trying to access my-applications without auth, redirect to login
  if (request.nextUrl.pathname.startsWith('/my-applications') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

