"use client"

import { useActionState, useState } from "react"
import { signIn, type SignInState } from "@/app/portal/actions"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const INITIAL_STATE: SignInState = { ok: true }

export default function LoginPage() {
  const { t } = useLanguage()
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, isPending] = useActionState(signIn, INITIAL_STATE)

  const errorMessage =
    state.code === "invalid_credentials" ? t("portal.login.invalidCredentials") : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <Image
              src="/sustentec-logo.png"
              alt="Sustentec"
              width={408}
              height={139}
              priority
              className="h-14 w-auto"
            />
            <p className="text-xs text-muted-foreground">{t("portal.login.tagline")}</p>
          </Link>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">{t("portal.login.welcome")}</CardTitle>
            <CardDescription>
              {t("portal.login.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              {errorMessage && (
                <div
                  data-testid="login-error"
                  className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t("portal.login.email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("portal.login.emailPlaceholder")}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("portal.login.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("portal.login.passwordPlaceholder")}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={
                      showPassword
                        ? t("portal.login.hidePassword")
                        : t("portal.login.showPassword")
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="remember" className="rounded border-border" />
                  <span className="text-muted-foreground">{t("portal.login.rememberMe")}</span>
                </label>
                <Link href="#" className="text-primary hover:underline">
                  {t("portal.login.forgotPassword")}
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isPending}
              >
                {isPending ? t("portal.login.submitting") : t("portal.login.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/" className="hover:text-primary transition-colors">
            {t("portal.login.backToSite")}
          </Link>
        </p>
      </div>
    </div>
  )
}
