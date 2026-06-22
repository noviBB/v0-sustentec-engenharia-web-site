"use client"

import { useState } from "react"
import Link from "next/link"
import { signOut } from "@/app/portal/actions"
import type { ProcessRow } from "@/modules/processes/processes.repo"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import {
  Leaf,
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Calendar,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface PortalSidebarProps {
  activeItem: string
  onItemChange: (item: string) => void
  selectedProcess: string | null
  onProcessChange: (processId: string) => void
  processes: ProcessRow[]
  unreadCount: number
}

export function PortalSidebar({
  activeItem,
  onItemChange,
  selectedProcess,
  onProcessChange,
  processes,
  unreadCount,
}: PortalSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [processesExpanded, setProcessesExpanded] = useState(true)
  const { t } = useLanguage()

  const unreadMessages = unreadCount

  const menuItems: Array<{
    id: string
    label: string
    icon: typeof LayoutDashboard
    badge?: number
  }> = [
    { id: "painel", label: t("portal.sidebar.menu.painel"), icon: LayoutDashboard },
    { id: "processos", label: t("portal.sidebar.menu.processos"), icon: FolderKanban },
    {
      id: "mensagens",
      label: t("portal.sidebar.menu.mensagens"),
      icon: MessageSquare,
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
    { id: "agendamentos", label: t("portal.sidebar.menu.agendamentos"), icon: Calendar },
    { id: "dados", label: t("portal.sidebar.menu.dados"), icon: User },
  ]

  const totalPendencias = processes.reduce(
    (acc, p) => acc + (p.pendencias_count ?? 0),
    0,
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#2d5a27]">
      <div className="p-4 border-b border-white/10">
        <Link href="/portal" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <Leaf className="w-6 h-6 text-[#2d5a27]" />
          </div>
          <div>
            <span className="text-lg font-bold text-white">
              Susten<span className="text-[#8bc34a]">tec</span>
            </span>
            <p className="text-xs text-white/70">{t("portal.sidebar.tagline")}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.id}>
            <button
              onClick={() => {
                if (item.id === "processos") {
                  setProcessesExpanded(!processesExpanded)
                } else {
                  onItemChange(item.id)
                  setIsMobileOpen(false)
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                activeItem === item.id && item.id !== "processos"
                  ? "bg-[#4caf50] text-white shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === "processos" && (
                <>
                  {totalPendencias > 0 && (
                    <Badge className="h-5 min-w-5 flex items-center justify-center text-xs rounded-full bg-amber-500 text-white mr-1">
                      {totalPendencias}
                    </Badge>
                  )}
                  {processesExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </>
              )}
              {item.badge != null && item.id !== "processos" && (
                <Badge
                  className={cn(
                    "h-5 min-w-5 flex items-center justify-center text-xs rounded-full",
                    activeItem === item.id
                      ? "bg-white text-[#4caf50]"
                      : "bg-[#4caf50] text-white"
                  )}
                >
                  {item.badge}
                </Badge>
              )}
            </button>

            {item.id === "processos" && processesExpanded && (
              <div className="ml-4 mt-1 space-y-1">
                {processes.map((process) => (
                  <button
                    key={process.id}
                    onClick={() => {
                      onProcessChange(process.id)
                      onItemChange("processo-detalhe")
                      setIsMobileOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all",
                      selectedProcess === process.id
                        ? "bg-[#4caf50] text-white shadow-md"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="flex-1 text-left min-w-0">
                      {process.code && (
                        <p className="text-[10px] font-semibold tracking-wider text-[#f5f1e6]/90 uppercase">
                          {process.code}
                        </p>
                      )}
                      <p className="truncate text-xs">{process.name ?? "—"}</p>
                    </div>
                    {process.pendencias_count > 0 && (
                      <Badge className="h-4 min-w-4 flex items-center justify-center text-[10px] rounded-full bg-amber-500 text-white">
                        {process.pendencias_count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/60 mb-3">{t("portal.sidebar.tech.heading")}</p>
        <div className="flex items-center gap-3 mb-3">
          {/* TODO(#9): per-tenant tech resolution when Notion adapter lands */}
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarImage src="/responsavel-ivon.jpg" alt="Dra. Ivón Oristela Benítez González" />
            <AvatarFallback className="bg-[#4caf50] text-white text-sm">IO</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              Dra. Ivón Oristela Benítez González
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full bg-[#4caf50] border-[#4caf50] text-white hover:bg-[#43a047] hover:border-[#43a047]"
        >
          <a
            href="https://wa.me/5522998706033"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {t("portal.sidebar.tech.whatsapp")}
          </a>
        </Button>
      </div>

      <div className="p-4 border-t border-white/10">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t("portal.sidebar.signOut")}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#2d5a27] border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link href="/portal" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-[#2d5a27]" />
            </div>
            <span className="text-lg font-bold text-white">
              Susten<span className="text-[#8bc34a]">tec</span>
            </span>
          </Link>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 text-white"
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 pt-16">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="absolute top-16 left-0 bottom-0 w-72">
            <SidebarContent />
          </div>
        </div>
      )}

      <aside className="hidden lg:block w-72 fixed left-0 top-0 bottom-0">
        <SidebarContent />
      </aside>
    </>
  )
}
