import { redirect } from "next/navigation"
import { AuthProvider } from "@/lib/auth-context"
import { sessionForUser } from "@/lib/auth/tenant"
import { authPort } from "@/lib/auth/port"
import { getClientForUser } from "@/lib/auth/tenant"
import { getProfileByUserId } from "@/lib/auth/tenant"

/**
 * Protected portal layout.
 *
 * Server component. Acts as the SINGLE source of truth for the portal's
 * auth/tenant resolution: every child of `(protected)/` receives `user`,
 * `profile`, and `client` via the `AuthProvider` seed — no other place
 * should re-fetch the user.
 *
 * Order of checks:
 *  1. `authPort.getCurrentUser()` — middleware already guards the route, but
 *     a server component must NEVER trust a client cookie blindly.
 *  2. Build a `session` from the authenticated user — this is what every
 *     RLS-aware repository call needs.
 *  3. `getProfileByUserId` / `getClientForUser` — surface display name and
 *     resolve the tenant under RLS. If a user has no `user_clients` link
 *     we bounce them to login with `?reason=no_tenant` rather than
 *     silently rendering the portal against `null`.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await authPort.getCurrentUser()

  if (!user) {
    redirect("/portal/login")
  }

  const session = sessionForUser(user)

  const [profile, client] = await Promise.all([
    getProfileByUserId(session, user.id),
    getClientForUser(session, user.id),
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
    <AuthProvider initial={{ user, profile, client }}>{children}</AuthProvider>
  )
}
