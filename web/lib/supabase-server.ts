import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for use in Server Components, Route Handlers, and Server Actions.
 * Uses the request cookies to maintain the user's session.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - cookies are read-only
          }
        },
      },
    }
  );
}

/**
 * Gets the current authenticated user from the session.
 * Returns null if not authenticated or Supabase is not configured.
 */
export async function getAuthenticatedUser() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Requires authentication for a route handler.
 * Returns the user if authenticated, or a 401 response if not.
 */
export async function requireAuth(): Promise<
  | { user: Awaited<ReturnType<typeof getAuthenticatedUser>>; error: null }
  | { user: null; error: Response }
> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      user: null,
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { user, error: null };
}
