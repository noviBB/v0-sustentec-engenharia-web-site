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
