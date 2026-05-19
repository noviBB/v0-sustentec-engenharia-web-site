"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo-only mock auth. There is no backend; these credentials are bundled into
// the client and gate access to mock data only. Replace with a real auth backend
// before wiring up any real client data.
const MOCK_USERS: Record<string, { user: User; password: string }> = {
  "cliente@exemplo.com": {
    user: { id: "1", name: "Engeprat", email: "cliente@exemplo.com" },
    password: "123456",
  },
  "victorf@sustentec-engenharia.com.br": {
    user: {
      id: "2",
      name: "Victor Leonardo Ferreira Coutinho",
      email: "victorf@sustentec-engenharia.com.br",
    },
    password: "sustentec1",
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedUser = localStorage.getItem("sustentec_user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)

    await new Promise(resolve => setTimeout(resolve, 1000))

    const entry = MOCK_USERS[email.toLowerCase().trim()]
    if (entry && entry.password === password) {
      setUser(entry.user)
      localStorage.setItem("sustentec_user", JSON.stringify(entry.user))
      setIsLoading(false)
      return true
    }

    setIsLoading(false)
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("sustentec_user")
    router.push("/portal/login")
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
