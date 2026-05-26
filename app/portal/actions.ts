"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * Server action: ends the current Supabase session and bounces the user to
 * the login page. Invoked from the portal header/sidebar "Sair" controls.
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/portal/login")
}
