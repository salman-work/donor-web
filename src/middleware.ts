import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAuthenticated } from './utilities/auth'

export function middleware(req: NextRequest) {
  console.log('Middleware invoked for URL:', req.url)
  // Only protect routes under /app/(frontend)/(protected)
  //const protectedPath = /^\/app\/(frontend)\/(protected)(\/|$)/
  const protectedPaths = [
    /^\/cars(\/|$)/,
    /^\/contact(\/|$)/,
    /^\/logout(\/|$)/,
    /^\/campaign(\/|$)/,
  ]

  if (protectedPaths.some((re) => re.test(req.nextUrl.pathname))) {
    if (!isAuthenticated(req)) {
      // Redirect to login page with returnUrl
      const loginUrl = new URL('/login', req.url)
      if (![/^\/logout(\/|$)/].some((re) => re.test(req.nextUrl.pathname))) {
        loginUrl.searchParams.set('returnUrl', req.nextUrl.pathname + req.nextUrl.search)
      } else {
        console.log('User is logging out, redirecting to home')
        return NextResponse.redirect(new URL('/home', req.url))
      }
      console.log('User not authenticated, redirecting to login:', loginUrl.toString())
      return NextResponse.redirect(loginUrl)
    }
    // Example: restrict to admin and editor roles
    // if (!hasRole(req, ['admin', 'editor'])) {
    //   const forbiddenUrl = new URL('/forbidden', req.url)
    //   return NextResponse.redirect(forbiddenUrl)
    // }
  }
  return NextResponse.next()
}

export const config = {
  //matcher: ['/app/(frontend)/(protected)/:path*'],
  matcher: ['/cars/:path*', '/contact/:path*', '/logout/:path*', '/campaign/:path*'],
}
