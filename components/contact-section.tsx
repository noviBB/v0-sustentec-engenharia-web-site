"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import { submitContact } from "@/lib/actions/contact"
import {
  contactSubmissionSchema,
  type ContactSubmissionInput,
} from "@/lib/schemas/contact"

export function ContactSection() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactSubmissionInput>({
    resolver: zodResolver(contactSubmissionSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", phone: "", message: "" },
  })

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitContact(values)

      if (result.ok) {
        toast({
          title: t("contact.success.title"),
          description: t("contact.success.description"),
        })
        reset()
        return
      }

      const description =
        result.code === "validation"
          ? t("contact.error.validation")
          : result.ref
          ? `${t("contact.error.server")} (ref: ${result.ref})`
          : t("contact.error.server")

      toast({
        title: t("contact.error.title"),
        description,
        variant: "destructive",
      })
    })
  })

  const contactInfo = [
    {
      icon: MapPin,
      label: t("contact.address"),
      value: "Nova Friburgo - RJ, Brasil",
    },
    {
      icon: Phone,
      label: t("contact.phone"),
      value: "+55 (22) 99870-6033",
    },
    {
      icon: Mail,
      label: t("contact.email"),
      value: "contato@sustentec.com.br",
    },
  ]

  return (
    <section id="contact" className="py-20 md:py-28 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("contact.title")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("contact.subtitle")}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
            <form onSubmit={onSubmit} className="space-y-6" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">{t("contact.name")}</Label>
                <Input
                  id="name"
                  placeholder={t("contact.namePlaceholder")}
                  aria-invalid={errors.name ? "true" : "false"}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {t(errors.name?.message ?? "")}
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("contact.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("contact.emailPlaceholder")}
                    aria-invalid={errors.email ? "true" : "false"}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {t(errors.email?.message ?? "")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("contact.phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t("contact.phonePlaceholder")}
                    {...register("phone")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">{t("contact.message")}</Label>
                <Textarea
                  id="message"
                  placeholder={t("contact.messagePlaceholder")}
                  rows={5}
                  aria-invalid={errors.message ? "true" : "false"}
                  {...register("message")}
                />
                {errors.message && (
                  <p className="text-sm text-destructive">
                    {t(errors.message?.message ?? "")}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isPending ? t("contact.submitting") : t("contact.submit")}
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div className="space-y-6">
              {contactInfo.map((info, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <info.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {info.label}
                    </div>
                    <div className="font-medium text-foreground">
                      {info.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <div className="bg-primary rounded-2xl p-8 text-primary-foreground">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-lg">
                    {t("contact.whatsappLabel")}
                  </div>
                  <div className="text-sm text-primary-foreground/80">
                    {t("contact.whatsappTagline")}
                  </div>
                </div>
              </div>
              <p className="text-sm text-primary-foreground/90 mb-6">
                {t("contact.whatsappDescription")}
              </p>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <a
                  href="https://wa.me/5522998706033"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("contact.whatsapp")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
