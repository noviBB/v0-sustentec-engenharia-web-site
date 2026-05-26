import { redirect } from "next/navigation"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { createClient } from "@/lib/supabase/server"
import { getClientForUser } from "@/lib/auth/tenant"
import { getProfileByUserId } from "@/lib/db/profiles"

/**
 * Protected portal layout.
 *
 * Server component. Acts as the SINGLE source of truth for the portal's
 * auth/tenant resolution: every child of `(protected)/` receives `user`,
 * `profile`, and `client` via the `AuthProvider` seed — no other place
 * should re-fetch the user.
 *
 * Order of checks:
 *  1. `supabase.auth.getUser()` — middleware already guards the route, but
 *     a server component must NEVER trust a client cookie blindly.
 *  2. `getProfileByUserId` — surfaces the user's display name etc.
 *  3. `getClientForUser` — the tenant. If a user has no `user_clients`
 *     link we bounce them to login with `?reason=no_tenant` rather than
 *     silently rendering the portal against `null`.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/portal/login")
  }

  const [profile, client] = await Promise.all([
    getProfileByUserId(user.id),
    getClientForUser(user.id),
  ])

  if (!profile) {
    // Profile row should be created by the auth trigger; if it's missing
    // there's nothing meaningful to render.
    redirect("/portal/login?reason=no_profile")
  }

  if (!client) {
    // User is authenticated but not linked to any tenant — we can't render
    // a tenant-scoped portal for them.
    redirect("/portal/login?reason=no_tenant")
  }

  return (
    <AuthProvider initial={{ user, profile, client }}>
      {children}
      <Toaster />
    </AuthProvider>
  )
}
