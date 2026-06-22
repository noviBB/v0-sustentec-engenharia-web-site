"use client"

import {
  FileText,
  Search,
  MessageSquare,
  BarChart3,
  Map,
  Building,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/language-context"

export function ServicesSection() {
  const { t } = useLanguage()

  const services = [
    {
      icon: FileText,
      title: t("services.licensing.title"),
      description: t("services.licensing.desc"),
    },
    {
      icon: Search,
      title: t("services.studies.title"),
      description: t("services.studies.desc"),
    },
    {
      icon: MessageSquare,
      title: t("services.consulting.title"),
      description: t("services.consulting.desc"),
    },
    {
      icon: BarChart3,
      title: t("services.monitoring.title"),
      description: t("services.monitoring.desc"),
    },
    {
      icon: Map,
      title: t("services.geoprocessing.title"),
      description: t("services.geoprocessing.desc"),
    },
    {
      icon: Building,
      title: t("services.regularization.title"),
      description: t("services.regularization.desc"),
    },
  ]

  return (
    <section id="services" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("services.title")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("services.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card
              key={index}
              className="group hover:shadow-lg transition-all duration-300 border-border hover:border-primary/30 bg-card"
            >
              <CardHeader>
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <service.icon className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-xl text-card-foreground">
                  {service.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground text-base">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
