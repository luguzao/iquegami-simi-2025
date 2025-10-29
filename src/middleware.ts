import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Usar getUser() ao invés de getSession() por segurança
  // getUser() valida o token com o servidor Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = req.nextUrl.pathname;

  console.log('Middleware - Path:', pathname, 'User:', user ? 'Logged in' : 'Not logged in');

  // Se não há usuário e está tentando acessar dashboard, redirecionar para login
  if (!user && pathname.startsWith('/dashboard')) {
    console.log('Middleware - Redirecting unauthenticated user from dashboard to login');
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/'
    return NextResponse.redirect(redirectUrl)
  }

  // Se há usuário e está na página inicial, redirecionar para dashboard
  if (user && pathname === '/') {
    console.log('Middleware - Redirecting authenticated user from home to dashboard');
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}