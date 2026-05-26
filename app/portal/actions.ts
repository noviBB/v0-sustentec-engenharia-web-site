"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type SignInState = {
  ok: boolean
  code?: "invalid_credentials" | "unknown_error"
}

/**
 * Server action: signs the user in with email + password.
 *
 * On success, redirects to `/portal`. On failure, returns a discriminated
 * state object for `useActionState` consumers — never throws, never leaks
 * provider-level error messages to the client.
 */
export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { ok: false, code: "invalid_credentials" }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Treat every auth-provider failure as invalid credentials at the
    // boundary — we don't want to disclose whether an email exists.
    return { ok: false, code: "invalid_credentials" }
  }

  redirect("/portal")
}

/**
 * Server action: ends the current Supabase session and bounces the user to
 * the login page. Invoked from the portal header/sidebar "Sair" controls.
 *
 * `signOut` is wrapped in a try/catch so a flaky provider can't strand the
 * user on the portal — we redirect to `/portal/login` regardless, surfacing
 * the failure via `?error=signout_failed` for any banner UI.
 */
export async function signOut() {
  let failed = false
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      failed = true
      console.error(
        JSON.stringify({ event: "signOut.failed", error: error.message }),
      )
    }
  } catch (error) {
    failed = true
    console.error(
      JSON.stringify({
        event: "signOut.threw",
        error: error instanceof Error ? error.message : String(error),
      }),
    )
  }

  redirect(failed ? "/portal/login?error=signout_failed" : "/portal/login")
}
