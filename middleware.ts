import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the session token from the cookie
  const sessionToken = request.cookies.get('session_token')?.value

  // Define protected routes
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                          (request.nextUrl.pathname.startsWith('/api') && 
                           !request.nextUrl.pathname.startsWith('/api/auth') && 
                           !request.nextUrl.pathname.startsWith('/api/cron') &&
                           !request.nextUrl.pathname.startsWith('/api/public'))

  // If trying to access a protected route without a token
  if (isProtectedRoute && !sessionToken) {
    // If it's an API call, return 401
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Otherwise redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
}
