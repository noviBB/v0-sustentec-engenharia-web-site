"use client"

import Link from "next/link"
import { ArrowRight, Leaf, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-20 overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/50 via-background to-background" />
      <div className="absolute top-20 right-0 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Leaf className="h-4 w-4" />
              <span>{t("hero.subtitle")}</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 text-balance">
              {t("hero.title")}
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 text-pretty">
              {t("hero.description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Link href="#contact">
                  {t("hero.cta")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#tracker">{t("hero.secondary")}</Link>
              </Button>
            </div>

            {/* Quick Features */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {t("tracker.feature3.title")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {t("tracker.feature2.title")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Leaf className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {t("tracker.feature4.title")}
                </span>
              </div>
            </div>
          </div>

          {/* Hero Image/Illustration */}
          <div className="relative hidden lg:block">
            <div className="relative bg-card rounded-2xl shadow-2xl p-8 border border-border">
              {/* Mock Dashboard Preview */}
              <div className="bg-sidebar rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-baseline">
                    <span className="text-xl font-bold text-sidebar-foreground">
                      Susten
                    </span>
                    <span className="text-xl font-bold text-primary">tec</span>
                  </div>
                  <span className="text-xs text-sidebar-foreground/70 px-2 py-1 bg-sidebar-accent rounded">
                    Portal do Cliente
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-sidebar-accent rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-sidebar-foreground">
                        Painel Principal
                      </div>
                    </div>
                  </div>

                  {["Meu Processo", "Documentos", "Histórico", "Mensagens"].map(
                    (item, i) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 p-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-sidebar-foreground/50" />
                        </div>
                        <span className="text-sm">{item}</span>
                        {i === 3 && (
                          <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            2
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Stats Preview */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">65%</div>
                  <div className="text-xs text-muted-foreground">Progresso</div>
                </div>
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">120</div>
                  <div className="text-xs text-muted-foreground">Dias</div>
                </div>
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-accent">Baixo</div>
                  <div className="text-xs text-muted-foreground">Risco</div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-card rounded-xl shadow-lg p-4 border border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-foreground">
                  Em análise
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
