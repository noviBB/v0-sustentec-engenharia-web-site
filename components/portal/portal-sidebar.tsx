"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import {
  Leaf,
  LayoutDashboard,
  FileText,
  FolderOpen,
  History,
  AlertCircle,
  MessageSquare,
  Calendar,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface PortalSidebarProps {
  activeItem: string
  onItemChange: (item: string) => void
}

const menuItems = [
  { id: "painel", label: "Painel Principal", icon: LayoutDashboard },
  { id: "processo", label: "Meu Processo", icon: FileText },
  { id: "documentos", label: "Documentos", icon: FolderOpen },
  { id: "historico", label: "Histórico", icon: History },
  { id: "pendencias", label: "Pendências", icon: AlertCircle, badge: 2 },
  { id: "mensagens", label: "Mensagens", icon: MessageSquare, badge: 1 },
  { id: "agendamentos", label: "Agendamentos", icon: Calendar },
  { id: "dados", label: "Dados Cadastrais", icon: User },
]

export function PortalSidebar({ activeItem, onItemChange }: PortalSidebarProps) {
  const { user, logout } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link href="/portal" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Leaf className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <span className="text-lg font-bold text-sidebar-foreground">
              Susten<span className="text-primary">tec</span>
            </span>
            <p className="text-xs text-sidebar-foreground/70">Portal do Cliente</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onItemChange(item.id)
              setIsMobileOpen(false)
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeItem === item.id
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <Badge
                variant={activeItem === item.id ? "secondary" : "default"}
                className={cn(
                  "h-5 min-w-5 flex items-center justify-center text-xs",
                  activeItem === item.id
                    ? "bg-primary-foreground text-primary"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {item.badge}
              </Badge>
            )}
          </button>
        ))}
      </nav>

      {/* Responsible Tech */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60 mb-3">Seu responsável técnico</p>
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/placeholder-user.jpg" />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">LM</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              Eng. Leonardo Martins
            </p>
            <p className="text-xs text-sidebar-foreground/60">Responsável Técnico</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Falar no WhatsApp
        </Button>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair do Portal
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between p-4">
          <Link href="/portal" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">
              Susten<span className="text-primary">tec</span>
            </span>
          </Link>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 text-sidebar-foreground"
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 pt-16">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="absolute top-16 left-0 bottom-0 w-72 bg-sidebar flex flex-col">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-sidebar border-r border-sidebar-border flex-col fixed left-0 top-0 bottom-0">
        <SidebarContent />
      </aside>
    </>
  )
}
