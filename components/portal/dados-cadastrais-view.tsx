"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Briefcase,
  Building2,
  MapPinned,
  Pencil,
} from "lucide-react"
import type { Client } from "@/lib/db/clients"
import { updateClientAction } from "@/lib/actions/clients"
import {
  clientCadastralSchema,
  type ClientCadastralInput,
} from "@/lib/schemas/client"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"

interface DadosCadastraisViewProps {
  client: Client
}

const DASH = "—"

/** Formats a 14-digit BR CNPJ string as `XX.XXX.XXX/XXXX-XX`. */
function formatCnpj(raw: string | null | undefined): string {
  if (!raw) return DASH
  const digits = raw.replace(/\D/g, "")
  if (digits.length !== 14) return raw
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function nonEmpty(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : DASH
}

/**
 * Joins the address components into a single human-readable line. Empty
 * components are dropped silently so partial cadastrals still render.
 */
function formatAddress(client: Client): string {
  const parts = [
    client.address_street,
    client.address_city,
    client.address_state,
    client.address_postal_code,
  ].filter((p): p is string => !!p && p.trim().length > 0)
  return parts.length > 0 ? parts.join(", ") : DASH
}

export function DadosCadastraisView({ client }: DadosCadastraisViewProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [snapshot, setSnapshot] = useState<Client>(client)
  const [isPending, startTransition] = useTransition()

  const form = useForm<ClientCadastralInput>({
    resolver: zodResolver(clientCadastralSchema),
    // Cast: schema's transform produces `string | undefined` so the union
    // is compatible with the form's input strings.
    defaultValues: {
      contact_name: snapshot.contact_name ?? "",
      contact_role: snapshot.contact_role ?? "",
      contact_email: snapshot.contact_email ?? "",
      contact_phone: snapshot.contact_phone ?? "",
      address_street: snapshot.address_street ?? "",
      address_city: snapshot.address_city ?? "",
      address_state: snapshot.address_state ?? "",
      address_postal_code: snapshot.address_postal_code ?? "",
    } as ClientCadastralInput,
  })

  const fields: ReadonlyArray<{
    icon: typeof Building
    label: string
    value: string
  }> = [
    {
      icon: FileText,
      label: t("portal.dados.field.cnpj"),
      value: formatCnpj(snapshot.notion_cnpj_filter),
    },
    {
      icon: User,
      label: t("portal.dados.field.contactName"),
      value: nonEmpty(snapshot.contact_name),
    },
    {
      icon: Briefcase,
      label: t("portal.dados.field.contactRole"),
      value: nonEmpty(snapshot.contact_role),
    },
    {
      icon: Mail,
      label: t("portal.dados.field.contactEmail"),
      value: nonEmpty(snapshot.contact_email),
    },
    {
      icon: Phone,
      label: t("portal.dados.field.contactPhone"),
      value: nonEmpty(snapshot.contact_phone),
    },
    {
      icon: MapPin,
      label: t("portal.dados.field.address"),
      value: formatAddress(snapshot),
    },
  ]

  function startEditing() {
    form.reset({
      contact_name: snapshot.contact_name ?? "",
      contact_role: snapshot.contact_role ?? "",
      contact_email: snapshot.contact_email ?? "",
      contact_phone: snapshot.contact_phone ?? "",
      address_street: snapshot.address_street ?? "",
      address_city: snapshot.address_city ?? "",
      address_state: snapshot.address_state ?? "",
      address_postal_code: snapshot.address_postal_code ?? "",
    } as ClientCadastralInput)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
  }

  function onSubmit(values: ClientCadastralInput) {
    startTransition(async () => {
      const result = await updateClientAction(values)
      if (result.ok) {
        // Optimistic merge: zod transformed empty strings -> undefined, but
        // the row still has whatever the server persisted. We keep what the
        // user typed (normalized) so the read view reflects the edit
        // without an extra round-trip.
        setSnapshot((prev) => ({
          ...prev,
          contact_name: values.contact_name ?? null,
          contact_role: values.contact_role ?? null,
          contact_email: values.contact_email ?? null,
          contact_phone: values.contact_phone ?? null,
          address_street: values.address_street ?? null,
          address_city: values.address_city ?? null,
          address_state: values.address_state ?? null,
          address_postal_code: values.address_postal_code ?? null,
        }))
        toast({
          title: t("portal.dados.toast.saved"),
        })
        setIsEditing(false)
      } else {
        toast({
          variant: "destructive",
          title: t("portal.dados.toast.error"),
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("portal.dados.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("portal.dados.subtitle")}
          </p>
        </div>
        {!isEditing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startEditing}
            className="gap-2"
          >
            <Pencil className="w-4 h-4" />
            {t("portal.dados.action.edit")}
          </Button>
        )}
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
            <div className="p-1.5 bg-[#f5f1e6] border border-[#e5dcc5] rounded-lg">
              <Building className="w-4 h-4 text-[#2d5a27]" />
            </div>
            {t("portal.dados.section.client")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 p-4 mb-6 rounded-lg bg-[#f5f1e6] border border-[#e5dcc5]">
            <div className="p-2.5 bg-white rounded-xl">
              <Building className="w-6 h-6 text-[#2d5a27]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#2d5a27]/70">
                {t("portal.dados.section.client.eyebrow")}
              </p>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {snapshot.name}
              </p>
            </div>
          </div>

          {isEditing ? (
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1.5">
                  <Label htmlFor="contact_name">
                    {t("portal.dados.field.contactName")}
                  </Label>
                  <Input id="contact_name" {...form.register("contact_name")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_role">
                    {t("portal.dados.field.contactRole")}
                  </Label>
                  <Input id="contact_role" {...form.register("contact_role")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_email">
                    {t("portal.dados.field.contactEmail")}
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    {...form.register("contact_email")}
                    aria-invalid={!!form.formState.errors.contact_email}
                  />
                  {form.formState.errors.contact_email?.message && (
                    <p className="text-xs text-destructive">
                      {t(String(form.formState.errors.contact_email.message))}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_phone">
                    {t("portal.dados.field.contactPhone")}
                  </Label>
                  <Input
                    id="contact_phone"
                    {...form.register("contact_phone")}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="address_street">
                    {t("portal.dados.field.addressStreet")}
                  </Label>
                  <Input
                    id="address_street"
                    {...form.register("address_street")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address_city">
                    {t("portal.dados.field.addressCity")}
                  </Label>
                  <Input
                    id="address_city"
                    {...form.register("address_city")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address_state">
                    {t("portal.dados.field.addressState")}
                  </Label>
                  <Input
                    id="address_state"
                    {...form.register("address_state")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address_postal_code">
                    {t("portal.dados.field.addressPostalCode")}
                  </Label>
                  <Input
                    id="address_postal_code"
                    {...form.register("address_postal_code")}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelEditing}
                  disabled={isPending}
                >
                  {t("portal.dados.action.cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {t("portal.dados.action.save")}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {fields.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                </div>
              ))}
              {/* Render granular city/state/postal when present — keeps the
                  consolidated "Endereço" line tidy but surfaces details. */}
              {(snapshot.address_city ||
                snapshot.address_state ||
                snapshot.address_postal_code) && (
                <>
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("portal.dados.field.addressCity")}
                      </p>
                      <p className="font-medium">
                        {nonEmpty(snapshot.address_city)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPinned className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("portal.dados.field.addressState")}
                      </p>
                      <p className="font-medium">
                        {nonEmpty(snapshot.address_state)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("portal.dados.field.addressPostalCode")}
                      </p>
                      <p className="font-medium">
                        {nonEmpty(snapshot.address_postal_code)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
