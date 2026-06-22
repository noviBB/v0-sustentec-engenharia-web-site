"use client"

import Link from "next/link"
import { Leaf } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export function Footer() {
  const { t } = useLanguage()

  const currentYear = new Date().getFullYear()

  const services = [
    t("services.licensing.title"),
    t("services.studies.title"),
    t("services.consulting.title"),
    t("services.monitoring.title"),
    t("services.geoprocessing.title"),
  ]

  const company = [
    { label: t("nav.about"), href: "#about" },
    { label: t("nav.services"), href: "#services" },
    { label: t("nav.tracker"), href: "#tracker" },
    { label: t("nav.contact"), href: "#contact" },
  ]

  return (
    <footer className="bg-sidebar text-sidebar-foreground pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-sidebar-foreground">
                  Susten
                </span>
                <span className="text-2xl font-bold text-primary">tec</span>
              </div>
            </Link>
            <p className="text-sm text-sidebar-foreground/70 mb-4">
              {t("footer.description")}
            </p>
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-primary" />
              <span className="text-xs text-sidebar-foreground/60">
                {t("hero.subtitle")}
              </span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-sidebar-foreground mb-4">
              {t("footer.services")}
            </h3>
            <ul className="space-y-3">
              {services.map((service, index) => (
                <li key={index}>
                  <Link
                    href="#services"
                    className="text-sm text-sidebar-foreground/70 hover:text-primary transition-colors"
                  >
                    {service}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-sidebar-foreground mb-4">
              {t("footer.company")}
            </h3>
            <ul className="space-y-3">
              {company.map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className="text-sm text-sidebar-foreground/70 hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-sidebar-foreground mb-4">
              {t("footer.contact")}
            </h3>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li>Nova Friburgo - RJ, Brasil</li>
              <li>+55 (22) 99870-6033</li>
              <li>contato@sustentec.com.br</li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-sidebar-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-sidebar-foreground/60">
              © {currentYear} Sustentec. {t("footer.rights")}
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="#"
                className="text-sm text-sidebar-foreground/60 hover:text-primary transition-colors"
              >
                {t("footer.privacy")}
              </Link>
              <Link
                href="#"
                className="text-sm text-sidebar-foreground/60 hover:text-primary transition-colors"
              >
                {t("footer.terms")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
