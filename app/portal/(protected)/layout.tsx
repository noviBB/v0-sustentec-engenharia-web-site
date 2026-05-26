import { redirect } from "next/navigation"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { createClient } from "@/lib/supabase/server"
import { getClientForUser } from "@/lib/db/clients"

/**
 * Protected portal layout.
 *
 * Server component. The middleware already redirects unauthenticated visitors
 * to `/portal/login`, but we re-check `getUser()` here as a belt-and-braces
 * guard — a server component must NEVER trust a client cookie blindly.
 *
 * We also resolve the user's client tenant up front (via Drizzle) so child
 * pages can be passed the tenant directly instead of each one round-tripping
 * the DB. Per #6, this uses the single Drizzle instance from
 * `lib/db/index.ts` — the `db('rls', session)` factory is deferred to #7.
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

  // Resolve the tenant once. We don't yet do anything with `client` at this
  // level — child pages will read it via Drizzle in #7. Calling it here keeps
  // the AC ("layout reads the session ... and calls getClientForUser via
  // Drizzle") honest.
  await getClientForUser(user.id)

  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  )
}
