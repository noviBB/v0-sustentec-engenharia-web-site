"use client"

import { useAuth } from "@/lib/auth-context"
import { Bell, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function PortalHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          O controle do seu processo na palma da sua mao.
        </h1>
        <p className="text-sm text-muted-foreground">
          Portal exclusivo para clientes acompanharem cada etapa do licenciamento ambiental em tempo real.
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
            2
          </Badge>
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-muted px-2 py-1 rounded-lg transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {user?.name?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:block">{user?.name || "Cliente"}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Meu Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configuracoes</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
