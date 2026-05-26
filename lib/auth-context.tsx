"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

interface AuthContextType {
  /** The Supabase auth user, or `null` when unauthenticated. */
  user: User | null
  /** `true` while we wait for the first `getUser()` call to resolve. */
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Reactive client-side subscriber to the Supabase auth session.
 *
 * The previous mock-auth implementation was removed in #6. The session
 * itself lives in HttpOnly cookies managed by `@supabase/ssr`; this provider
 * just exposes a React-friendly handle so components that need to react to
 * sign-in/sign-out events (e.g. updating an avatar) can do so without
 * round-tripping the server.
 *
 * Server components should read the session from `lib/supabase/server.ts`
 * instead — that is the source of truth.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    let cancelled = false

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      setUser(data.user ?? null)
      setIsLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setIsLoading(false)
      },
    )

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
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
