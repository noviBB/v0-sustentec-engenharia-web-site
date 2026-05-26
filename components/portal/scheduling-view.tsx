"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Info,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { cn } from "@/lib/utils"
import { createAppointmentAction } from "@/lib/actions/appointments"
import type { ResponsibleTechOption } from "@/lib/db/responsibleTechs"

interface SchedulingViewProps {
  techs: ResponsibleTechOption[]
}

const TIME_SLOTS = (() => {
  const slots: string[] = []
  for (let h = 9; h <= 17; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`)
    if (h < 17) slots.push(`${String(h).padStart(2, "0")}:30`)
  }
  return slots
})()

const ALLOWED_WEEKDAYS = new Set([1, 2, 3, 4]) // Mon, Tue, Wed, Thu

function isDateDisabled(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date < today) return true
  return !ALLOWED_WEEKDAYS.has(date.getDay())
}

function formatDateBR(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

/**
 * Combines a chosen date + a "HH:MM" string into an ISO timestamp anchored
 * to America/Sao_Paulo (UTC-3, no DST since 2019). Going through the
 * browser's local TZ would let two users in different TZs both book "10:00"
 * and produce different UTC slots — breaking the unique constraint's intent.
 */
function combineDateTimeIso(date: Date, time: string): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}T${time}:00-03:00`
}

export function SchedulingView({ techs }: SchedulingViewProps) {
  const { toast } = useToast()
  const { t } = useLanguage()
  const [isPending, startTransition] = useTransition()
  const [tech, setTech] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const canSubmit =
    tech !== "" && date !== undefined && time !== "" && subject.trim() !== "" && !isPending

  function resetForm() {
    setTech("")
    setDate(undefined)
    setTime("")
    setSubject("")
    setMessage("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !date) return

    const scheduled_for = combineDateTimeIso(date, time)

    startTransition(async () => {
      const result = await createAppointmentAction({
        responsible_tech_id: tech,
        scheduled_for,
        subject: subject.trim(),
        notes: message.trim() || undefined,
      })

      if (result.ok) {
        toast({
          title: t("portal.appointment.success.title"),
          description: t("portal.appointment.success.description"),
        })
        resetForm()
        return
      }

      switch (result.code) {
        case "double_booked":
          toast({
            variant: "destructive",
            title: t("portal.appointment.error.doubleBooked.title"),
            description: t("portal.appointment.error.doubleBooked.description"),
          })
          break
        case "validation":
          toast({
            variant: "destructive",
            title: t("portal.appointment.error.validation.title"),
            description: t("portal.appointment.error.validation.description"),
          })
          break
        case "unauthorized":
          toast({
            variant: "destructive",
            title: t("portal.appointment.error.unauthorized.title"),
            description: t("portal.appointment.error.unauthorized.description"),
          })
          break
        default:
          toast({
            variant: "destructive",
            title: t("portal.appointment.error.server.title"),
            description: result.ref
              ? `${t("portal.appointment.error.server.description")} (ref ${result.ref})`
              : t("portal.appointment.error.server.description"),
          })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {t("portal.scheduling.title")}
        </h2>
        <p className="text-muted-foreground">
          {t("portal.scheduling.subtitle")}
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
            <div className="p-1.5 bg-[#f5f1e6] border border-[#e5dcc5] rounded-lg">
              <CalendarIcon className="w-4 h-4 text-[#2d5a27]" />
            </div>
            {t("portal.scheduling.card.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-[#f5f1e6] border border-[#e5dcc5]">
            <div className="p-2 bg-white rounded-lg shrink-0">
              <Info className="w-4 h-4 text-[#2d5a27]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2d5a27]">
                {t("portal.scheduling.hours.title")}
              </p>
              <p className="text-sm text-[#2d5a27]/80">
                {t("portal.scheduling.hours.description")}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tech" className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4 text-[#2d5a27]" />
                {t("portal.scheduling.field.tech")}
              </Label>
              <Select value={tech} onValueChange={setTech} disabled={techs.length === 0}>
                <SelectTrigger id="tech">
                  <SelectValue
                    placeholder={
                      techs.length === 0
                        ? t("portal.scheduling.field.tech.empty")
                        : t("portal.scheduling.field.tech.placeholder")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {techs.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <CalendarIcon className="w-4 h-4 text-[#2d5a27]" />
                  {t("portal.scheduling.field.date")}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? formatDateBR(date) : t("portal.scheduling.field.date.placeholder")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={isDateDisabled}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  {t("portal.scheduling.field.date.hint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4 text-[#2d5a27]" />
                  {t("portal.scheduling.field.time")}
                </Label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger id="time">
                    <SelectValue placeholder={t("portal.scheduling.field.time.placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                {t("portal.scheduling.field.subject")}
              </Label>
              <Input
                id="subject"
                placeholder={t("portal.scheduling.field.subject.placeholder")}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">
                {t("portal.scheduling.field.message")}{" "}
                <span className="text-muted-foreground font-normal">
                  {t("portal.scheduling.field.message.optional")}
                </span>
              </Label>
              <Textarea
                id="message"
                placeholder={t("portal.scheduling.field.message.placeholder")}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-[#2d5a27] hover:bg-[#1b3d19] text-white"
              >
                {isPending
                  ? t("portal.appointment.submitting")
                  : t("portal.scheduling.submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
