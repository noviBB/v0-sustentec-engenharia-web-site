// Demo-only mock data. Everything here ships in the client JS bundle and is
// readable in DevTools — this is NOT a security boundary, it's a UI filter.
// Replace with a real backend + ACL before exposing any real customer data.

export type ProcessBucket = "andamento" | "acompanhamento" | "finalizado"

export interface PortalProcess {
  id: string
  code: string
  name: string
  location: string
  status: string
  pendencias: number
  progress: number
  paymentsMade: number
  paymentsTotal: number
  paidAmount: string
  bucket: ProcessBucket
}

export interface PortalMessage {
  id: string
  from: "contato@sustentec-engenharia.com.br"
  to: string
  subject: string
  body: string
  date: string
  read?: boolean
  processCode?: string
}

const ENGEPRAT_EMAIL = "cliente@exemplo.com"
const VICTORF_EMAIL = "victorf@sustentec-engenharia.com.br"
const SUSTENTEC_EMAIL = "contato@sustentec-engenharia.com.br" as const

export const PROCESSES_BY_USER: Record<string, PortalProcess[]> = {
  [ENGEPRAT_EMAIL]: [
    {
      id: "proc-001",
      code: "CC 26-004",
      name: "Enge Prat - UNOPS Planos",
      location: "",
      status: "Em analise",
      pendencias: 2,
      progress: 65,
      paymentsMade: 2,
      paymentsTotal: 3,
      paidAmount: "R$ 4.500,00",
      bucket: "andamento",
    },
    {
      id: "proc-002",
      code: "CC 26-016",
      name: "Licenças Enge Prat - Niterói",
      location: "Niterói - RJ",
      status: "Aguardando docs",
      pendencias: 3,
      progress: 25,
      paymentsMade: 1,
      paymentsTotal: 4,
      paidAmount: "R$ 2.200,00",
      bucket: "andamento",
    },
    {
      id: "proc-003",
      code: "CC 26-017",
      name: "Laudo de Avaliação Cautelar de Vizinhança - Enge Prat",
      location: "",
      status: "Concluido",
      pendencias: 0,
      progress: 100,
      paymentsMade: 2,
      paymentsTotal: 2,
      paidAmount: "R$ 3.800,00",
      bucket: "finalizado",
    },
  ],
  [VICTORF_EMAIL]: [
    {
      id: "victor-26-021",
      code: "CC 26-021",
      name: "Fazenda Sapucay",
      location: "",
      status: "Em andamento",
      pendencias: 0,
      progress: 50,
      paymentsMade: 0,
      paymentsTotal: 0,
      paidAmount: "—",
      bucket: "andamento",
    },
    {
      id: "victor-24-016",
      code: "CC 24-016",
      name: "Hydroen",
      location: "",
      status: "Em andamento",
      pendencias: 0,
      progress: 50,
      paymentsMade: 0,
      paymentsTotal: 0,
      paidAmount: "—",
      bucket: "andamento",
    },
    {
      id: "victor-24-015",
      code: "CC 24-015",
      name: "IF Hydroen",
      location: "",
      status: "Em acompanhamento",
      pendencias: 0,
      progress: 0,
      paymentsMade: 0,
      paymentsTotal: 0,
      paidAmount: "—",
      bucket: "acompanhamento",
    },
    {
      id: "victor-24-017",
      code: "CC 24-017",
      name: "ASV Fluminense Industrial",
      location: "",
      status: "Em acompanhamento",
      pendencias: 0,
      progress: 0,
      paymentsMade: 0,
      paymentsTotal: 0,
      paidAmount: "—",
      bucket: "acompanhamento",
    },
    {
      id: "victor-24-044",
      code: "CC 24-044",
      name: "Demarcação de Faixa - Fluminense Industrial",
      location: "",
      status: "Em acompanhamento",
      pendencias: 0,
      progress: 0,
      paymentsMade: 0,
      paymentsTotal: 0,
      paidAmount: "—",
      bucket: "acompanhamento",
    },
    {
      id: "victor-24-061",
      code: "CC 24-061",
      name: "Programas Ambientais LI Hydroen",
      location: "",
      status: "Em acompanhamento",
      pendencias: 0,
      progress: 0,
      paymentsMade: 0,
      paymentsTotal: 0,
      paidAmount: "—",
      bucket: "acompanhamento",
    },
    {
      id: "victor-25-072",
      code: "CC 25-072",
      name: "LO Hydroen",
      location: "",
      status: "Em acompanhamento",
      pendencias: 0,
      progress: 0,
      paymentsMade: 0,
      paymentsTotal: 0,
      paidAmount: "—",
      bucket: "acompanhamento",
    },
    {
      id: "victor-25-073",
      code: "CC 25-073",
      name: "Renovação LO - Fazenda Sapucay",
      location: "",
      status: "Em acompanhamento",
      pendencias: 0,
      progress: 0,
      paymentsMade: 0,
      paymentsTotal: 0,
      paidAmount: "—",
      bucket: "acompanhamento",
    },
    {
      id: "victor-25-119",
      code: "CC 25-119",
      name: "Laudo Maraú",
      location: "",
      status: "Concluido",
      pendencias: 0,
      progress: 100,
      paymentsMade: 0,
      paymentsTotal: 0,
      paidAmount: "—",
      bucket: "finalizado",
    },
  ],
}

export const MESSAGES_BY_USER: Record<string, PortalMessage[]> = {
  [ENGEPRAT_EMAIL]: [
    {
      id: "msg-eng-1",
      from: SUSTENTEC_EMAIL,
      to: ENGEPRAT_EMAIL,
      subject: "Andamento do processo CC 26-004",
      body: "Olá, informamos que o processo CC 26-004 foi encaminhado para análise técnica pelo órgão ambiental. Mantemos você atualizado sobre as próximas etapas.",
      date: "2026-04-02T10:00:00Z",
      read: false,
      processCode: "CC 26-004",
    },
    {
      id: "msg-eng-2",
      from: SUSTENTEC_EMAIL,
      to: ENGEPRAT_EMAIL,
      subject: "Documentação pendente — CC 26-016",
      body: "Identificamos pendências de documentação no processo CC 26-016. Por favor, envie o EIA/RIMA e o plano de emergência atualizado.",
      date: "2026-04-15T14:30:00Z",
      read: true,
      processCode: "CC 26-016",
    },
  ],
  [VICTORF_EMAIL]: [
    {
      id: "msg-vic-1",
      from: SUSTENTEC_EMAIL,
      to: VICTORF_EMAIL,
      subject: "Boas-vindas ao Portal Sustentec",
      body: "Olá Victor, seu acesso ao portal foi habilitado. Em breve disponibilizaremos os detalhes completos dos seus processos. Qualquer dúvida, fale conosco no WhatsApp.",
      date: "2026-05-19T09:00:00Z",
      read: false,
    },
  ],
}

export function getProcessesForEmail(email: string | undefined | null): PortalProcess[] {
  if (!email) return []
  return PROCESSES_BY_USER[email.toLowerCase().trim()] ?? []
}

export function getMessagesForEmail(email: string | undefined | null): PortalMessage[] {
  if (!email) return []
  return MESSAGES_BY_USER[email.toLowerCase().trim()] ?? []
}
