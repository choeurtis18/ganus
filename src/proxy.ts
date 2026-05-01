import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const protectedPaths = ['/chat', '/profile', '/admin', '/dashboard', '/cv', '/onboarding']
const authPaths = ['/auth/login', '/auth/signup']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const pathnameWithoutLocale = pathname.replace(/^\/(fr|en)/, '') || '/'

  const isProtected = protectedPaths.some((p) =>
    pathnameWithoutLocale.startsWith(p)
  )
  const isAuth = authPaths.some((p) => pathnameWithoutLocale.startsWith(p))

  const intlResponse = intlMiddleware(request)
  if (!isProtected && !isAuth) return intlResponse

  const response =
    intlResponse ??
    NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const locale = pathname.split('/')[1] || 'fr'

  if (isProtected && !user) {
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url))
  }

  if (isAuth && user) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf)).*)'],
}
