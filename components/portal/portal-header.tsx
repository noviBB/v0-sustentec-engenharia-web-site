"use client"

import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/language-context"
import { signOut } from "@/app/portal/actions"
import { Bell, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** One process with open pendências, as listed in the notifications menu. */
export interface PendenciasSummaryItem {
  id: string
  name: string | null
  code: string | null
  count: number
}

interface PortalHeaderProps {
  onItemChange: (item: string) => void
  /** Open pendências per process — the badge shows the total. */
  pendencias: PendenciasSummaryItem[]
  /** Opens the given process on its pendências tab. */
  onOpenPendencias: (processId: string) => void
}

export function PortalHeader({
  onItemChange,
  pendencias,
  onOpenPendencias,
}: PortalHeaderProps) {
  const { user, displayName } = useAuth()
  const { t } = useLanguage()
  const initial = displayName.trim().charAt(0).toUpperCase() || "C"
  const totalPendencias = pendencias.reduce((acc, p) => acc + p.count, 0)

  return (
    <header className="h-auto bg-card border-b border-border">
      {/* Top bar with logo, title, and user controls */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo - visible on desktop */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold text-foreground">
                Susten<span className="text-primary">tec</span>
              </span>
              <div className="w-8 h-8 border-2 border-primary rounded-lg grid grid-cols-2 gap-0.5 p-1">
                <div className="bg-primary rounded-sm"></div>
                <div className="bg-primary rounded-sm"></div>
                <div className="bg-primary rounded-sm"></div>
                <div className="bg-primary rounded-sm"></div>
              </div>
            </div>
          </Link>
          <span className="text-xs text-muted-foreground">engenharia e meio ambiente</span>
        </div>

        {/* Center Title */}
        <div className="flex-1 lg:flex-none lg:text-center px-4">
          <h1 className="text-lg md:text-xl font-semibold text-primary">
            {t("portal.header.title")}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            {t("portal.header.subtitle")}
          </p>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* Notifications — total open pendências; the menu lists them per project. */}
          <DropdownMenu>
            <DropdownMenuTrigger className="relative p-2 hover:bg-muted rounded-lg transition-colors flex items-center gap-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="hidden sm:inline text-sm text-muted-foreground">
                {t("portal.header.notifications")}
              </span>
              {totalPendencias > 0 && (
                <Badge className="h-5 min-w-5 flex items-center justify-center text-xs bg-red-500 text-white">
                  {totalPendencias}
                </Badge>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>
                {t("portal.header.notifications.title")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {pendencias.length === 0 ? (
                <DropdownMenuItem disabled>
                  {t("portal.header.notifications.empty")}
                </DropdownMenuItem>
              ) : (
                pendencias.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => onOpenPendencias(p.id)}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="truncate">
                      {p.code ? `${p.code} — ` : ""}
                      {p.name ?? "—"}
                    </span>
                    <Badge className="bg-amber-100 text-amber-800 shrink-0">
                      {(p.count === 1
                        ? t("portal.header.notifications.itemCount.one")
                        : t("portal.header.notifications.itemCount.other")
                      ).replace("{count}", String(p.count))}
                    </Badge>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-muted px-3 py-2 rounded-lg transition-colors border border-border">
              <Avatar className="h-7 w-7">
                <AvatarImage src="/placeholder-user.jpg" />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:flex flex-col items-start leading-tight">
                <span>{displayName}</span>
                {user?.email && displayName !== user.email && (
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                )}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onItemChange("dados")}>{t("portal.menu.profile")}</DropdownMenuItem>
              <DropdownMenuItem>{t("portal.menu.settings")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full text-left text-destructive text-sm px-2 py-1.5 rounded-sm hover:bg-accent"
                >
                  {t("portal.menu.signOut")}
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
