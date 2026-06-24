"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { AuthUser } from "@/lib/auth/port"
import { clientAuthPort } from "@/lib/auth/adapters/supabase.client"
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
  user: AuthUser
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
  const [user, setUser] = useState<AuthUser>(initial.user)

  useEffect(() => {
    // Subscribe so client-side reactivity (e.g. another tab signs out)
    // still works. We deliberately do NOT call `getCurrentUser()` on mount —
    // the server already resolved the user and passed it in via `initial`.
    // Auth lives behind the port; the browser adapter wraps Supabase's
    // `onAuthStateChange` and returns an unsubscribe fn.
    const unsubscribe = clientAuthPort.onAuthStateChange!((nextUser) => {
      if (nextUser) {
        setUser(nextUser)
      }
      // No-op on sign-out: middleware will redirect on the next nav.
    })

    return unsubscribe
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
