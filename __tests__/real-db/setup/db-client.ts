import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as jwt from 'jsonwebtoken'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
// Local Supabase JWT secret (from supabase status --output json)
const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long'

/** Service role client — bypasses RLS, used for test setup/teardown only */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Anonymous (public) client — no session */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Mints a JWT for the given user ID directly using the local JWT secret.
 * This bypasses GoTrue auth flow — suitable for testing RLS with real user context.
 */
export function mintUserJwt(userId: string, email: string, role = 'authenticated'): string {
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign(
    {
      iss: 'supabase-demo',
      sub: userId,
      aud: 'authenticated',
      role,
      email,
      exp: now + 3600,
      iat: now,
    },
    JWT_SECRET
  )
}

/**
 * Returns a Supabase client authenticated as the given user (by userId).
 * Uses a minted JWT — no GoTrue signIn required.
 */
export function clientForUser(
  userId: string,
  email: string
): { client: SupabaseClient; userId: string; accessToken: string } {
  const accessToken = mintUserJwt(userId, email)
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  return { client, userId, accessToken }
}

/**
 * @deprecated Use clientForUser() instead. Kept for compatibility.
 * Creates a Supabase client signed in as the given user (via GoTrue signIn).
 */
export async function clientAs(
  email: string,
  password: string
): Promise<{ client: SupabaseClient; userId: string; accessToken: string }> {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`signIn failed for ${email}: ${error?.message}`)
  const authedClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  return {
    client: authedClient,
    userId: data.user!.id,
    accessToken: data.session.access_token,
  }
}
