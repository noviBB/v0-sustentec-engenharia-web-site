"use client"

import { MessageCircle, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

export function SupportSection() {
  const { t } = useLanguage()

  return (
    <section id="suporte" className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="bg-primary rounded-2xl p-8 md:p-12 text-primary-foreground shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex items-start gap-4 max-w-2xl">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  {t("support.heading")}
                </h2>
                <p className="text-base text-primary-foreground/90">
                  {t("support.subtitle")}
                </p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-primary-foreground/80">
                  <Phone className="w-4 h-4" />
                  <span className="font-medium">{t("support.phone_display")}</span>
                </p>
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="w-full md:w-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <a
                  href="https://wa.me/5522998706033"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("support.cta")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
