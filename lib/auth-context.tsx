"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/db/profiles"
import type { Client } from "@/lib/db/tenants"

/**
 * Server-resolved portal context.
 *
 * The protected layout fetches `user`, `profile`, and `client` server-side
 * (single source of truth) and seeds this provider via `initial`. The client
 * subscribes to `onAuthStateChange` so other-tab sign-outs / token rotations
 * still propagate, but it never re-fetches `getUser()` itself — that would
 * just race with the server-resolved state.
 */
export type PortalContext = {
  user: User
  profile: Profile
  client: Client
}

interface AuthContextValue extends PortalContext {
  /** Convenience accessor: `profile.display_name ?? user.email`. */
  displayName: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({
  initial,
  children,
}: {
  initial: PortalContext
  children: ReactNode
}) {
  const [user, setUser] = useState<User>(initial.user)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe so client-side reactivity (e.g. another tab signs out)
    // still works. We deliberately do NOT call `getUser()` on mount —
    // the server already resolved the user and passed it in via `initial`.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user)
        }
        // No-op on SIGNED_OUT: middleware will redirect on the next nav.
      },
    )

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  const displayName = initial.profile.display_name ?? user.email ?? ""

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: initial.profile,
        client: initial.client,
        displayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
