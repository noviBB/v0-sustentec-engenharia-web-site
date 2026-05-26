"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type Language = "pt" | "en"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Navigation
    "nav.home": "Início",
    "nav.services": "Serviços",
    "nav.about": "Sobre",
    "nav.tracker": "Sustentec Tracker",
    "nav.contact": "Contato",
    "nav.clientArea": "Área do Cliente",

    // Hero
    "hero.subtitle": "engenharia e meio ambiente",
    "hero.title": "Soluções ambientais inteligentes para um futuro sustentável",
    "hero.description":
      "Transparência, tecnologia e compromisso em cada etapa do seu processo de licenciamento ambiental.",
    "hero.cta": "Fale Conosco",
    "hero.secondary": "Conheça o Tracker",

    // Stats
    "stats.years": "anos de experiência",
    "stats.yearsDesc": "Referência em engenharia e meio ambiente.",
    "stats.processes": "processos conduzidos",
    "stats.processesDesc": "Atuação em diversos segmentos e portes de empreendimento.",
    "stats.coverage": "Atuação em todo o estado do RJ",
    "stats.coverageDesc": "Conhecimento técnico e relacionamento com os principais órgãos.",
    "stats.team": "Equipe especializada e multidisciplinar",
    "stats.teamDesc": "Profissionais qualificados para garantir o melhor resultado.",

    // Services
    "services.title": "Nossos Serviços",
    "services.subtitle": "Soluções completas em engenharia ambiental",
    "services.licensing.title": "Licenciamento Ambiental",
    "services.licensing.desc":
      "Condução completa do processo de licenciamento junto aos órgãos ambientais (INEA, IBAMA, Prefeituras).",
    "services.studies.title": "Estudos Ambientais",
    "services.studies.desc":
      "Elaboração de EIA/RIMA, RAS, PCA, PRAD e demais estudos técnicos exigidos.",
    "services.consulting.title": "Consultoria Ambiental",
    "services.consulting.desc":
      "Assessoria técnica especializada para adequação ambiental do seu empreendimento.",
    "services.monitoring.title": "Monitoramento Ambiental",
    "services.monitoring.desc":
      "Acompanhamento contínuo de indicadores ambientais e cumprimento de condicionantes.",
    "services.geoprocessing.title": "Geoprocessamento",
    "services.geoprocessing.desc":
      "Elaboração de mapas temáticos, análises espaciais e georreferenciamento.",
    "services.regularization.title": "Regularização Fundiária",
    "services.regularization.desc":
      "Apoio técnico para regularização de áreas e imóveis rurais e urbanos.",

    // Tracker
    "tracker.badge": "SUSTENTEC TRACKER",
    "tracker.title": "Acompanhamento inteligente do seu licenciamento ambiental",
    "tracker.description":
      "Portal exclusivo para clientes acompanharem cada etapa do licenciamento ambiental em tempo real.",
    "tracker.feature1.title": "Transparência total",
    "tracker.feature1.desc": "Acompanhe cada etapa do seu processo em tempo real.",
    "tracker.feature2.title": "Agilidade",
    "tracker.feature2.desc": "Monitoramento contínuo e comunicação rápida.",
    "tracker.feature3.title": "Segurança",
    "tracker.feature3.desc": "Seus documentos e dados protegidos com máxima segurança.",
    "tracker.feature4.title": "Sustentabilidade",
    "tracker.feature4.desc": "Cuidamos do meio ambiente e do futuro do seu negócio.",
    "tracker.cta": "Acesse o Portal",
    "tracker.tagline": "Mais que um sistema, uma parceria estratégica para o sucesso do seu projeto.",

    // Values
    "values.title": "Por que escolher a Sustentec?",
    "values.subtitle": "Nossos diferenciais",
    "values.experience.title": "Experiência Comprovada",
    "values.experience.desc":
      "Mais de 10 anos de atuação no mercado com histórico de sucesso em projetos complexos.",
    "values.technology.title": "Tecnologia Avançada",
    "values.technology.desc":
      "Utilizamos ferramentas modernas de gestão e acompanhamento de processos.",
    "values.team.title": "Equipe Qualificada",
    "values.team.desc":
      "Profissionais especializados em diversas áreas da engenharia ambiental.",
    "values.commitment.title": "Compromisso com Resultados",
    "values.commitment.desc":
      "Foco em entregar soluções eficientes dentro do prazo e orçamento.",

    // Contact
    "contact.title": "Entre em Contato",
    "contact.subtitle": "Estamos prontos para atender você",
    "contact.name": "Nome",
    "contact.email": "E-mail",
    "contact.phone": "Telefone",
    "contact.message": "Mensagem",
    "contact.submit": "Enviar Mensagem",
    "contact.address": "Endereço",
    "contact.whatsapp": "Falar no WhatsApp",
    "contact.namePlaceholder": "Seu nome completo",
    "contact.emailPlaceholder": "seu@email.com",
    "contact.phonePlaceholder": "(22) 99999-9999",
    "contact.messagePlaceholder": "Como podemos ajudar?",
    "contact.submitting": "Enviando...",
    "contact.success.title": "Mensagem enviada",
    "contact.success.description":
      "Recebemos seu contato. Nossa equipe responderá em breve.",
    "contact.error.title": "Não foi possível enviar",
    "contact.error.validation":
      "Confira os campos destacados e tente novamente.",
    "contact.error.server":
      "Ocorreu um erro ao registrar sua mensagem. Tente novamente em instantes.",
    "contact.validation.nameRequired": "Informe seu nome completo.",
    "contact.validation.emailInvalid": "Informe um e-mail válido.",
    "contact.validation.messageRequired": "Escreva uma mensagem.",
    "contact.whatsappLabel": "WhatsApp",
    "contact.whatsappTagline": "Atendimento rápido",
    "contact.whatsappDescription":
      "Fale diretamente com nossa equipe técnica para tirar dúvidas ou solicitar um orçamento.",

    // Support
    "support.heading": "Dúvidas ou precisa de suporte?",
    "support.subtitle": "Fale com nossa equipe diretamente pelo WhatsApp.",
    "support.cta": "Falar no WhatsApp",
    "support.phone_display": "+55 (22) 99870-6033",

    // Footer
    "footer.description":
      "Soluções ambientais inteligentes para um futuro sustentável.",
    "footer.services": "Serviços",
    "footer.company": "Empresa",
    "footer.contact": "Contato",
    "footer.rights": "Todos os direitos reservados.",
    "footer.privacy": "Política de Privacidade",
    "footer.terms": "Termos de Uso",

    // Portal — login
    "portal.login.tagline": "Portal do Cliente",
    "portal.login.welcome": "Bem-vindo de volta",
    "portal.login.description": "Acesse sua conta para acompanhar seu processo",
    "portal.login.email": "E-mail",
    "portal.login.emailPlaceholder": "seu@email.com",
    "portal.login.password": "Senha",
    "portal.login.passwordPlaceholder": "Digite sua senha",
    "portal.login.showPassword": "Mostrar senha",
    "portal.login.hidePassword": "Ocultar senha",
    "portal.login.rememberMe": "Lembrar de mim",
    "portal.login.forgotPassword": "Esqueci minha senha",
    "portal.login.submit": "Entrar",
    "portal.login.submitting": "Entrando...",
    "portal.login.backToSite": "Voltar ao site principal",
    "portal.login.invalidCredentials":
      "E-mail ou senha incorretos. Tente novamente.",

    // Portal — header / user menu
    "portal.menu.profile": "Meu Perfil",
    "portal.menu.settings": "Configurações",
    "portal.menu.signOut": "Sair",

    // Portal — appointment scheduling
    "portal.appointment.submitting": "Agendando...",
    "portal.appointment.success.title": "Agendamento solicitado",
    "portal.appointment.success.description":
      "Recebemos sua solicitação. Você receberá uma confirmação em breve.",
    "portal.appointment.error.doubleBooked.title": "Horário indisponível",
    "portal.appointment.error.doubleBooked.description":
      "Esse horário já foi reservado por outro cliente. Por favor, escolha outro.",
    "portal.appointment.error.validation.title": "Confira os dados",
    "portal.appointment.error.validation.description":
      "Alguns campos do agendamento estão inválidos. Revise e tente novamente.",
    "portal.appointment.error.unauthorized.title": "Sessão expirada",
    "portal.appointment.error.unauthorized.description":
      "Sua sessão expirou. Faça login novamente para concluir o agendamento.",
    "portal.appointment.error.server.title": "Não foi possível agendar",
    "portal.appointment.error.server.description":
      "Ocorreu um erro inesperado ao registrar o agendamento. Tente novamente em instantes.",
    "portal.appointment.validation.techRequired":
      "Selecione um responsável técnico.",
    "portal.appointment.validation.slotRequired":
      "Selecione uma data e um horário válidos.",
    "portal.appointment.validation.subjectRequired":
      "Informe o assunto do agendamento.",

    // Portal — messages
    "portal.messages.markRead": "Marcar como lida",
    "portal.messages.empty.title": "Nenhuma mensagem ainda",
    "portal.messages.empty.description":
      "Você verá aqui as respostas enviadas pela equipe Sustentec.",
  },
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.services": "Services",
    "nav.about": "About",
    "nav.tracker": "Sustentec Tracker",
    "nav.contact": "Contact",
    "nav.clientArea": "Client Area",

    // Hero
    "hero.subtitle": "engineering and environment",
    "hero.title": "Intelligent environmental solutions for a sustainable future",
    "hero.description":
      "Transparency, technology and commitment at every stage of your environmental licensing process.",
    "hero.cta": "Contact Us",
    "hero.secondary": "Discover Tracker",

    // Stats
    "stats.years": "years of experience",
    "stats.yearsDesc": "Reference in engineering and environment.",
    "stats.processes": "processes conducted",
    "stats.processesDesc": "Acting in various segments and enterprise sizes.",
    "stats.coverage": "Coverage throughout Rio de Janeiro state",
    "stats.coverageDesc": "Technical knowledge and relationship with main agencies.",
    "stats.team": "Specialized and multidisciplinary team",
    "stats.teamDesc": "Qualified professionals to ensure the best results.",

    // Services
    "services.title": "Our Services",
    "services.subtitle": "Complete solutions in environmental engineering",
    "services.licensing.title": "Environmental Licensing",
    "services.licensing.desc":
      "Complete management of the licensing process with environmental agencies (INEA, IBAMA, City Halls).",
    "services.studies.title": "Environmental Studies",
    "services.studies.desc":
      "Preparation of EIA/RIMA, RAS, PCA, PRAD and other required technical studies.",
    "services.consulting.title": "Environmental Consulting",
    "services.consulting.desc":
      "Specialized technical advisory for environmental compliance of your enterprise.",
    "services.monitoring.title": "Environmental Monitoring",
    "services.monitoring.desc":
      "Continuous monitoring of environmental indicators and compliance with conditions.",
    "services.geoprocessing.title": "Geoprocessing",
    "services.geoprocessing.desc":
      "Preparation of thematic maps, spatial analysis and georeferencing.",
    "services.regularization.title": "Land Regularization",
    "services.regularization.desc":
      "Technical support for regularization of rural and urban areas and properties.",

    // Tracker
    "tracker.badge": "SUSTENTEC TRACKER",
    "tracker.title": "Intelligent tracking of your environmental licensing",
    "tracker.description":
      "Exclusive portal for clients to track each stage of environmental licensing in real time.",
    "tracker.feature1.title": "Total Transparency",
    "tracker.feature1.desc": "Track each stage of your process in real time.",
    "tracker.feature2.title": "Agility",
    "tracker.feature2.desc": "Continuous monitoring and fast communication.",
    "tracker.feature3.title": "Security",
    "tracker.feature3.desc": "Your documents and data protected with maximum security.",
    "tracker.feature4.title": "Sustainability",
    "tracker.feature4.desc": "We care for the environment and the future of your business.",
    "tracker.cta": "Access Portal",
    "tracker.tagline": "More than a system, a strategic partnership for your project&apos;s success.",

    // Values
    "values.title": "Why choose Sustentec?",
    "values.subtitle": "Our differentials",
    "values.experience.title": "Proven Experience",
    "values.experience.desc":
      "Over 10 years in the market with a track record of success in complex projects.",
    "values.technology.title": "Advanced Technology",
    "values.technology.desc":
      "We use modern process management and tracking tools.",
    "values.team.title": "Qualified Team",
    "values.team.desc":
      "Professionals specialized in various areas of environmental engineering.",
    "values.commitment.title": "Commitment to Results",
    "values.commitment.desc":
      "Focus on delivering efficient solutions within deadline and budget.",

    // Contact
    "contact.title": "Get in Touch",
    "contact.subtitle": "We are ready to assist you",
    "contact.name": "Name",
    "contact.email": "Email",
    "contact.phone": "Phone",
    "contact.message": "Message",
    "contact.submit": "Send Message",
    "contact.address": "Address",
    "contact.whatsapp": "Chat on WhatsApp",
    "contact.namePlaceholder": "Your full name",
    "contact.emailPlaceholder": "you@email.com",
    "contact.phonePlaceholder": "(22) 99999-9999",
    "contact.messagePlaceholder": "How can we help?",
    "contact.submitting": "Sending...",
    "contact.success.title": "Message sent",
    "contact.success.description":
      "We received your message. Our team will get back to you shortly.",
    "contact.error.title": "Could not send",
    "contact.error.validation":
      "Please review the highlighted fields and try again.",
    "contact.error.server":
      "Something went wrong saving your message. Please try again in a moment.",
    "contact.validation.nameRequired": "Please enter your full name.",
    "contact.validation.emailInvalid": "Please enter a valid email.",
    "contact.validation.messageRequired": "Please write a message.",
    "contact.whatsappLabel": "WhatsApp",
    "contact.whatsappTagline": "Quick support",
    "contact.whatsappDescription":
      "Talk directly to our technical team to ask questions or request a quote.",

    // Support
    "support.heading": "Questions or need support?",
    "support.subtitle": "Talk to our team directly on WhatsApp.",
    "support.cta": "Chat on WhatsApp",
    "support.phone_display": "+55 (22) 99870-6033",

    // Footer
    "footer.description":
      "Intelligent environmental solutions for a sustainable future.",
    "footer.services": "Services",
    "footer.company": "Company",
    "footer.contact": "Contact",
    "footer.rights": "All rights reserved.",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms of Use",

    // Portal — login
    "portal.login.tagline": "Client Portal",
    "portal.login.welcome": "Welcome back",
    "portal.login.description": "Sign in to track your process",
    "portal.login.email": "Email",
    "portal.login.emailPlaceholder": "you@email.com",
    "portal.login.password": "Password",
    "portal.login.passwordPlaceholder": "Enter your password",
    "portal.login.showPassword": "Show password",
    "portal.login.hidePassword": "Hide password",
    "portal.login.rememberMe": "Remember me",
    "portal.login.forgotPassword": "Forgot password",
    "portal.login.submit": "Sign in",
    "portal.login.submitting": "Signing in...",
    "portal.login.backToSite": "Back to main site",
    "portal.login.invalidCredentials":
      "Invalid email or password. Please try again.",

    // Portal — header / user menu
    "portal.menu.profile": "My Profile",
    "portal.menu.settings": "Settings",
    "portal.menu.signOut": "Sign out",

    // Portal — appointment scheduling
    "portal.appointment.submitting": "Scheduling...",
    "portal.appointment.success.title": "Appointment requested",
    "portal.appointment.success.description":
      "We received your request. You will get a confirmation shortly.",
    "portal.appointment.error.doubleBooked.title": "Slot unavailable",
    "portal.appointment.error.doubleBooked.description":
      "That slot is already booked by another client. Please pick a different one.",
    "portal.appointment.error.validation.title": "Check the form",
    "portal.appointment.error.validation.description":
      "Some appointment fields are invalid. Please review and try again.",
    "portal.appointment.error.unauthorized.title": "Session expired",
    "portal.appointment.error.unauthorized.description":
      "Your session has expired. Please sign in again to finish scheduling.",
    "portal.appointment.error.server.title": "Could not schedule",
    "portal.appointment.error.server.description":
      "Something went wrong saving your appointment. Please try again shortly.",
    "portal.appointment.validation.techRequired":
      "Please select a responsible engineer.",
    "portal.appointment.validation.slotRequired":
      "Please select a valid date and time.",
    "portal.appointment.validation.subjectRequired":
      "Please enter the meeting subject.",

    // Portal — messages
    "portal.messages.markRead": "Mark as read",
    "portal.messages.empty.title": "No messages yet",
    "portal.messages.empty.description":
      "Replies from the Sustentec team will appear here.",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("pt")

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
