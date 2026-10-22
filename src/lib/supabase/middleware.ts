import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    // If Supabase credentials are not configured yet, allow public access
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect /publisher routes
  if (pathname.startsWith('/publisher') && pathname !== '/publisher/login') {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/publisher/login'
      return NextResponse.redirect(url)
    }

    // Verify user exists in publishers table
    const { data: publisher } = await supabase
      .from('publishers')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!publisher) {
      const url = request.nextUrl.clone()
      url.pathname = '/publisher/login'
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }
  }

  // Redirect away from login if already authenticated publisher
  if (pathname === '/publisher/login' && user) {
    const { data: publisher } = await supabase
      .from('publishers')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (publisher) {
      const url = request.nextUrl.clone()
      url.pathname = '/publisher'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
