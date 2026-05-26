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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PortalHeaderProps {
  onItemChange: (item: string) => void
}

export function PortalHeader({ onItemChange }: PortalHeaderProps) {
  const { user, displayName } = useAuth()
  const { t } = useLanguage()
  const initial = displayName.trim().charAt(0).toUpperCase() || "C"

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
            O controle do seu processo na palma da sua mao.
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            Portal exclusivo para clientes acompanharem cada etapa do licenciamento ambiental em tempo real.
          </p>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-muted rounded-lg transition-colors flex items-center gap-2">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="hidden sm:inline text-sm text-muted-foreground">Notificacoes</span>
            <Badge className="h-5 min-w-5 flex items-center justify-center text-xs bg-red-500 text-white">
              2
            </Badge>
          </button>

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
