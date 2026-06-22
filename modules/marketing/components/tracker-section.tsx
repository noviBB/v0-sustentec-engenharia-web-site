"use client"

import Image from "next/image"
import Link from "next/link"
import { Eye, Zap, Shield, Leaf, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

export function TrackerSection() {
  const { t } = useLanguage()

  const features = [
    {
      icon: Eye,
      title: t("tracker.feature1.title"),
      description: t("tracker.feature1.desc"),
    },
    {
      icon: Zap,
      title: t("tracker.feature2.title"),
      description: t("tracker.feature2.desc"),
    },
    {
      icon: Shield,
      title: t("tracker.feature3.title"),
      description: t("tracker.feature3.desc"),
    },
    {
      icon: Leaf,
      title: t("tracker.feature4.title"),
      description: t("tracker.feature4.desc"),
    },
  ]

  return (
    <section id="tracker" className="py-20 md:py-28 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold mb-6">
              {t("tracker.badge")}
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-balance">
              {t("tracker.title")}
            </h2>

            <p className="text-lg text-muted-foreground mb-8">
              {t("tracker.description")}
            </p>

            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 mb-8">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  {t("tracker.tagline")}
                </p>
              </div>
            </div>

            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Link href="#contact">
                {t("tracker.cta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Image/Dashboard Preview */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/propostadesite%20%281%29-XYYqScwjhYFWqPM3xlMukLQu9SwIkF.png"
                alt="Sustentec Tracker Dashboard"
                width={800}
                height={600}
                className="w-full h-auto"
              />
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-card rounded-xl shadow-lg p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Web • Tablet • Mobile
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Acesse de onde estiver
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
