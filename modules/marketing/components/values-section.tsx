"use client"

import { Award, Cpu, Users, Target } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export function ValuesSection() {
  const { t } = useLanguage()

  const values = [
    {
      icon: Award,
      title: t("values.experience.title"),
      description: t("values.experience.desc"),
    },
    {
      icon: Cpu,
      title: t("values.technology.title"),
      description: t("values.technology.desc"),
    },
    {
      icon: Users,
      title: t("values.team.title"),
      description: t("values.team.desc"),
    },
    {
      icon: Target,
      title: t("values.commitment.title"),
      description: t("values.commitment.desc"),
    },
  ]

  return (
    <section id="about" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">
            {t("values.subtitle")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            {t("values.title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <value.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">
                {value.title}
              </h3>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
