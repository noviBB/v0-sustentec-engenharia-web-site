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
    "stats.processes": "projetos conduzidos",
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
    "tracker.feature1.desc": "Acompanhe cada etapa do seu projeto em tempo real.",
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
    "contact.error.rateLimited":
      "Muitas tentativas. Tente novamente em alguns minutos.",
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
    "portal.login.description": "Acesse sua conta para acompanhar seu projeto",
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
      "Não foi possível registrar o agendamento. Tente novamente em instantes; se o problema persistir, fale conosco pelo WhatsApp informando o código abaixo.",
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
    "portal.messages.title": "Mensagens",
    "portal.messages.subtitle":
      "Conversa entre você e a equipe Sustentec, vinculada ao seu e-mail cadastrado.",
    "portal.messages.noSubject": "(sem assunto)",
    "portal.messages.badge.outbound": "Você enviou",
    "portal.messages.badge.inbound": "Recebida",
    "portal.messages.badge.unread": "Não lida",
    "portal.messages.from": "De:",
    "portal.messages.to": "Para:",
    "portal.messages.error.server.title": "Não foi possível marcar como lida",
    "portal.messages.error.server.description":
      "Ocorreu um erro inesperado. Tente novamente em instantes.",

    // Portal — scheduling
    "portal.scheduling.title": "Agendamentos",
    "portal.scheduling.subtitle":
      "Marque uma reunião com seu responsável técnico em poucos cliques.",
    "portal.scheduling.card.title": "AGENDAR REUNIÃO",
    "portal.scheduling.hours.title": "Horário de atendimento",
    "portal.scheduling.hours.description":
      "Segunda a quinta-feira, das 09:00 às 17:30. Selecione abaixo uma data e um horário disponíveis.",
    "portal.scheduling.field.tech": "Responsável técnico",
    "portal.scheduling.field.tech.placeholder":
      "Selecione o responsável técnico",
    "portal.scheduling.field.tech.empty": "Nenhum responsável disponível",
    "portal.scheduling.field.date": "Data",
    "portal.scheduling.field.date.placeholder": "Selecione uma data",
    "portal.scheduling.field.date.hint":
      "Disponível apenas de segunda a quinta-feira.",
    "portal.scheduling.field.time": "Horário",
    "portal.scheduling.field.time.placeholder": "Selecione um horário",
    "portal.scheduling.field.subject": "Assunto",
    "portal.scheduling.field.subject.placeholder":
      "Ex.: dúvidas sobre o protocolo do projeto CC 26-016",
    "portal.scheduling.field.message": "Mensagem",
    "portal.scheduling.field.message.optional": "(opcional)",
    "portal.scheduling.field.message.placeholder":
      "Detalhe o que gostaria de discutir na reunião.",
    "portal.scheduling.submit": "Solicitar agendamento",

    // Portal — dashboard
    "portal.dashboard.greeting": "Olá, {name}!",
    "portal.dashboard.subtitle":
      "Bem-vindo ao seu portal. Acompanhe aqui o andamento dos seus projetos ambientais.",
    "portal.dashboard.unread.one":
      "Você tem {count} mensagem não lida.",
    "portal.dashboard.unread.other":
      "Você tem {count} mensagens não lidas.",
    "portal.dashboard.stat.total": "TOTAL DE PROJETOS",
    "portal.dashboard.stat.total.label": "projetos cadastrados",
    "portal.dashboard.stat.inProgress": "EM ANDAMENTO",
    "portal.dashboard.stat.inProgress.label": "projetos ativos",
    "portal.dashboard.stat.accompaniment": "EM ACOMPANHAMENTO",
    "portal.dashboard.stat.accompaniment.label": "em acompanhamento",
    "portal.dashboard.stat.finalized": "FINALIZADOS",
    "portal.dashboard.stat.finalized.label": "licenças emitidas",
    "portal.dashboard.processes.title": "MEUS PROJETOS",
    "portal.dashboard.processes.empty.title":
      "Nenhum projeto cadastrado ainda",
    "portal.dashboard.processes.empty.description":
      "Quando a equipe Sustentec cadastrar projetos para você, eles aparecerão aqui.",
    "portal.dashboard.bucket.andamento": "Em andamento",
    "portal.dashboard.bucket.acompanhamento": "Em acompanhamento",
    "portal.dashboard.bucket.finalizado": "Finalizado",
    "portal.dashboard.bucket.empty": "Nenhum projeto nesta categoria.",
    "portal.dashboard.pendencias.one": "{count} pendência",
    "portal.dashboard.pendencias.other": "{count} pendências",
    "portal.dashboard.viewDetails": "Ver detalhes",
    "portal.dashboard.shortcut.schedule.title": "Agendar Reunião",
    "portal.dashboard.shortcut.schedule.description":
      "Marque uma reunião com seu responsável técnico",
    "portal.dashboard.shortcut.newProcess.title": "Nova proposta do Projeto",
    "portal.dashboard.shortcut.newProcess.description":
      "Solicite um novo projeto de licenciamento",
    "portal.dashboard.shortcut.newProcess.mail.subject":
      "Solicitação de novo projeto",
    "portal.dashboard.shortcut.newProcess.mail.body":
      "Olá, equipe Sustentec!\n\nGostaria de solicitar um novo projeto. Seguem os detalhes:\n\n- Empreendimento:\n- Município/UF:\n- Atividade:\n- Objetivo:\n\nAguardo o retorno de vocês.",
    "portal.dashboard.shortcut.pendencias.title": "Resolver Pendências",
    "portal.dashboard.shortcut.pendencias.one":
      "Você tem {count} item pendente",
    "portal.dashboard.shortcut.pendencias.other":
      "Você tem {count} itens pendentes",

    // Portal — dados cadastrais
    "portal.dados.title": "Dados Cadastrais",
    "portal.dados.subtitle": "Informações do cliente registradas no portal.",
    "portal.dados.section.client": "CLIENTE",
    "portal.dados.section.client.eyebrow": "Cliente",
    "portal.dados.field.cnpj": "CNPJ/CPF",
    "portal.dados.field.responsibleLegal": "Responsável legal",
    "portal.dados.field.email": "E-mail",
    "portal.dados.field.phone": "Telefone",
    "portal.dados.field.address": "Endereço de correspondência",
    "portal.dados.field.contactName": "Nome do contato",
    "portal.dados.field.contactRole": "Cargo",
    "portal.dados.field.contactEmail": "E-mail do contato",
    "portal.dados.field.contactPhone": "Telefone",
    "portal.dados.field.addressStreet": "Endereço",
    "portal.dados.field.addressCity": "Cidade",
    "portal.dados.field.addressState": "Estado",
    "portal.dados.field.addressPostalCode": "CEP",
    "portal.dados.action.edit": "Editar",
    "portal.dados.action.save": "Salvar",
    "portal.dados.action.cancel": "Cancelar",
    "portal.dados.toast.saved": "Dados cadastrais atualizados.",
    "portal.dados.toast.error": "Não foi possível salvar. Tente novamente.",
    "portal.dados.validation.invalidEmail": "E-mail inválido.",
    "portal.dados.validation.required": "Campo obrigatório.",

    // Portal — messages (read receipt)
    "portal.messages.readAt": "Lida em {date}",

    // Portal — payments
    "portal.payments.title": "Pagamentos",
    "portal.payments.installment": "Parcela {n}",
    "portal.payments.dueDate": "Vencimento",
    "portal.payments.amount": "Valor",
    "portal.payments.column.status": "Status",
    "portal.payments.status.pending": "Pendente",
    "portal.payments.status.paid": "Pago",
    "portal.payments.status.overdue": "Em atraso",
    "portal.payments.paidOn": "Pago em {date}",
    "portal.payments.dashboardTotal": "Total a pagar",
    "portal.payments.emailSubject": "Pagamento em atraso",

    // Portal — header
    "portal.header.tagline": "engenharia e meio ambiente",
    "portal.header.title": "O controle do seu projeto na palma da sua mão.",
    "portal.header.subtitle":
      "Portal exclusivo para clientes acompanharem cada etapa do licenciamento ambiental em tempo real.",
    "portal.header.notifications": "Notificações",
    "portal.header.notifications.title": "Pendências por projeto",
    "portal.header.notifications.empty": "Nenhuma pendência no momento",
    "portal.header.notifications.itemCount.one": "{count} pendência",
    "portal.header.notifications.itemCount.other": "{count} pendências",

    // Portal — process tabs
    "portal.process.tab.resumo": "Dados",
    "portal.process.tab.evolution": "Evolução",
    "portal.process.tab.documents": "Documentos",
    "portal.process.tab.pendencias": "Pendências",
    "portal.process.tab.payments": "Pagamentos",
    "portal.process.tab.map": "Localização",

    // Portal — process detail
    "portal.process.status.title": "STATUS ATUAL",
    "portal.process.status.lastUpdate": "Última atualização:",
    "portal.process.dates.title": "DATAS",
    "portal.process.dates.start": "Início",
    "portal.process.dates.due": "Prazo total estimado",
    "portal.process.resumo.title": "Dados do Projeto",
    "portal.process.resumo.licenseType": "Tipo de licença",
    "portal.process.resumo.agency": "Órgão licenciador",
    "portal.process.resumo.processingTime": "Tempo de tramitação",
    "portal.process.resumo.impactClass": "Classe de Impacto",
    "portal.process.resumo.responsibleTech": "Analista responsável",
    "portal.process.resumo.licensedActivity": "Atividade licenciada",
    "portal.process.resumo.objective": "Objetivo",
    "portal.process.resumo.observations": "Observações",
    "portal.process.resumo.cnpj": "CNPJ/CPF",
    "portal.process.resumo.instrument": "Instrumento",
    "portal.process.resumo.scope": "Escopo do serviço",
    "portal.process.resumo.applicant": "Requerente",
    "portal.process.resumo.clientContact": "Contato do cliente",
    "portal.process.resumo.contactEmail": "E-mail do contato",
    "portal.process.resumo.contactPhone": "Telefone de contato",
    "portal.process.evolution.title": "EVOLUÇÃO DO PROJETO",
    "portal.process.evolution.empty":
      "Ainda não há etapas cadastradas para este projeto.",
    "portal.process.documents.title": "DOCUMENTOS DO PROJETO",
    "portal.process.documents.empty.title": "Nenhum documento disponível",
    "portal.process.documents.empty.description":
      "Os documentos do seu projeto aparecerão aqui para download.",
    "portal.process.documents.download": "Baixar",
    "portal.process.pendencias.title": "PENDÊNCIAS DO PROJETO",
    "portal.process.pendencias.empty.title": "Nenhuma pendência",
    "portal.process.pendencias.empty.description":
      "Este projeto não possui pendências no momento.",
    "portal.process.pendencias.due": "Prazo: {date}",
    "portal.process.support.title": "DÚVIDAS OU PRECISA DE SUPORTE?",
    "portal.process.support.description":
      "Fale diretamente com a equipe Sustentec Projetos pelo WhatsApp.",
    "portal.process.support.cta": "Falar agora",
    "portal.process.transparent.title": "COMUNICAÇÃO TRANSPARENTE",
    "portal.process.transparent.description":
      "Todas as atualizações do seu projeto em um só lugar.",
    "portal.process.transparent.cta": "Mais informações",

    // Portal — task (pendência) badges
    "portal.task.status.aberta": "Aberta",
    "portal.task.status.em_andamento": "Em andamento",
    "portal.task.status.aguardando_cliente": "Aguardando cliente",
    "portal.task.status.concluida": "Concluída",
    "portal.task.status.arquivada": "Arquivada",
    "portal.task.priority.baixa": "Baixa",
    "portal.task.priority.media": "Média",
    "portal.task.priority.alta": "Alta",
    "portal.task.priority.urgente": "Urgente",

    // Portal — map
    "portal.map.title": "Localização",
    "portal.map.noCoordinates": "Coordenadas não cadastradas",
    "portal.map.dashboardTitle": "Projetos ativos",

    // Portal — project status badge
    "portal.status.andamento": "Em andamento",
    "portal.status.acompanhamento": "Em acompanhamento",
    "portal.status.finalizado": "Finalizado",

    // Portal — sidebar
    "portal.sidebar.tagline": "Portal do Cliente",
    "portal.sidebar.menu.painel": "Painel Principal",
    "portal.sidebar.menu.processos": "Meus Projetos",
    "portal.sidebar.menu.mensagens": "Mensagens",
    "portal.sidebar.menu.agendamentos": "Agendamentos",
    "portal.sidebar.menu.dados": "Dados Cadastrais",
    "portal.sidebar.tech.heading": "Responsável técnico de Sustentec-Engenharia",
    "portal.sidebar.tech.whatsapp": "Falar no WhatsApp",
    "portal.sidebar.signOut": "Sair do Portal",
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
    "stats.processes": "projects conducted",
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
    "tracker.feature1.desc": "Track each stage of your project in real time.",
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
    "contact.error.rateLimited":
      "Too many attempts. Please try again in a few minutes.",
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
    "portal.login.description": "Sign in to track your project",
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
      "We could not save your appointment. Please try again shortly; if the problem persists, contact us on WhatsApp quoting the code below.",
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
    "portal.messages.title": "Messages",
    "portal.messages.subtitle":
      "Thread between you and the Sustentec team, tied to your registered email.",
    "portal.messages.noSubject": "(no subject)",
    "portal.messages.badge.outbound": "You sent",
    "portal.messages.badge.inbound": "Received",
    "portal.messages.badge.unread": "Unread",
    "portal.messages.from": "From:",
    "portal.messages.to": "To:",
    "portal.messages.error.server.title": "Could not mark as read",
    "portal.messages.error.server.description":
      "Something went wrong. Please try again in a moment.",

    // Portal — scheduling
    "portal.scheduling.title": "Scheduling",
    "portal.scheduling.subtitle":
      "Book a meeting with your responsible engineer in a few clicks.",
    "portal.scheduling.card.title": "BOOK A MEETING",
    "portal.scheduling.hours.title": "Business hours",
    "portal.scheduling.hours.description":
      "Monday to Thursday, 09:00 to 17:30. Pick an available date and time below.",
    "portal.scheduling.field.tech": "Responsible engineer",
    "portal.scheduling.field.tech.placeholder":
      "Select the responsible engineer",
    "portal.scheduling.field.tech.empty": "No engineer available",
    "portal.scheduling.field.date": "Date",
    "portal.scheduling.field.date.placeholder": "Pick a date",
    "portal.scheduling.field.date.hint":
      "Available Monday to Thursday only.",
    "portal.scheduling.field.time": "Time",
    "portal.scheduling.field.time.placeholder": "Pick a time",
    "portal.scheduling.field.subject": "Subject",
    "portal.scheduling.field.subject.placeholder":
      "e.g. questions about the protocol for project CC 26-016",
    "portal.scheduling.field.message": "Message",
    "portal.scheduling.field.message.optional": "(optional)",
    "portal.scheduling.field.message.placeholder":
      "Describe what you would like to discuss in the meeting.",
    "portal.scheduling.submit": "Request appointment",

    // Portal — dashboard
    "portal.dashboard.greeting": "Hi, {name}!",
    "portal.dashboard.subtitle":
      "Welcome to your portal. Track the progress of your environmental projects here.",
    "portal.dashboard.unread.one":
      "You have {count} unread message.",
    "portal.dashboard.unread.other":
      "You have {count} unread messages.",
    "portal.dashboard.stat.total": "TOTAL PROJECTS",
    "portal.dashboard.stat.total.label": "projects registered",
    "portal.dashboard.stat.inProgress": "IN PROGRESS",
    "portal.dashboard.stat.inProgress.label": "active projects",
    "portal.dashboard.stat.accompaniment": "IN MONITORING",
    "portal.dashboard.stat.accompaniment.label": "in monitoring",
    "portal.dashboard.stat.finalized": "FINALIZED",
    "portal.dashboard.stat.finalized.label": "licenses issued",
    "portal.dashboard.processes.title": "MY PROJECTS",
    "portal.dashboard.processes.empty.title":
      "No projects registered yet",
    "portal.dashboard.processes.empty.description":
      "Projects registered by the Sustentec team will appear here.",
    "portal.dashboard.bucket.andamento": "In progress",
    "portal.dashboard.bucket.acompanhamento": "In monitoring",
    "portal.dashboard.bucket.finalizado": "Finalized",
    "portal.dashboard.bucket.empty": "No projects in this category.",
    "portal.dashboard.pendencias.one": "{count} pending item",
    "portal.dashboard.pendencias.other": "{count} pending items",
    "portal.dashboard.viewDetails": "View details",
    "portal.dashboard.shortcut.schedule.title": "Book a Meeting",
    "portal.dashboard.shortcut.schedule.description":
      "Book a meeting with your responsible engineer",
    "portal.dashboard.shortcut.newProcess.title": "New project proposal",
    "portal.dashboard.shortcut.newProcess.mail.subject": "New project request",
    "portal.dashboard.shortcut.newProcess.mail.body":
      "Hello, Sustentec team!\n\nI would like to request a new project. Here are the details:\n\n- Site/Enterprise:\n- City/State:\n- Activity:\n- Objective:\n\nLooking forward to hearing from you.",
    "portal.dashboard.shortcut.newProcess.description":
      "Request a new licensing project",
    "portal.dashboard.shortcut.pendencias.title": "Resolve Pending Items",
    "portal.dashboard.shortcut.pendencias.one":
      "You have {count} pending item",
    "portal.dashboard.shortcut.pendencias.other":
      "You have {count} pending items",

    // Portal — dados cadastrais
    "portal.dados.title": "Account Details",
    "portal.dados.subtitle": "Client information registered in the portal.",
    "portal.dados.section.client": "CLIENT",
    "portal.dados.section.client.eyebrow": "Client",
    "portal.dados.field.cnpj": "CNPJ/CPF",
    "portal.dados.field.responsibleLegal": "Legal representative",
    "portal.dados.field.email": "Email",
    "portal.dados.field.phone": "Phone",
    "portal.dados.field.address": "Mailing address",
    "portal.dados.field.contactName": "Contact name",
    "portal.dados.field.contactRole": "Role",
    "portal.dados.field.contactEmail": "Contact email",
    "portal.dados.field.contactPhone": "Phone",
    "portal.dados.field.addressStreet": "Address",
    "portal.dados.field.addressCity": "City",
    "portal.dados.field.addressState": "State",
    "portal.dados.field.addressPostalCode": "Postal code",
    "portal.dados.action.edit": "Edit",
    "portal.dados.action.save": "Save",
    "portal.dados.action.cancel": "Cancel",
    "portal.dados.toast.saved": "Client details updated.",
    "portal.dados.toast.error": "Couldn't save. Try again.",
    "portal.dados.validation.invalidEmail": "Invalid email.",
    "portal.dados.validation.required": "Required field.",

    // Portal — messages (read receipt)
    "portal.messages.readAt": "Read on {date}",

    // Portal — payments
    "portal.payments.title": "Payments",
    "portal.payments.installment": "Installment {n}",
    "portal.payments.dueDate": "Due date",
    "portal.payments.amount": "Amount",
    "portal.payments.column.status": "Status",
    "portal.payments.status.pending": "Pending",
    "portal.payments.status.paid": "Paid",
    "portal.payments.status.overdue": "Overdue",
    "portal.payments.paidOn": "Paid on {date}",
    "portal.payments.dashboardTotal": "Total due",
    "portal.payments.emailSubject": "Overdue payment",

    // Portal — header
    "portal.header.tagline": "engineering and environment",
    "portal.header.title": "Your project's progress in the palm of your hand.",
    "portal.header.subtitle":
      "Exclusive portal for clients to follow every step of their environmental licensing in real time.",
    "portal.header.notifications": "Notifications",
    "portal.header.notifications.title": "Pending items by project",
    "portal.header.notifications.empty": "No pending items right now",
    "portal.header.notifications.itemCount.one": "{count} pending item",
    "portal.header.notifications.itemCount.other": "{count} pending items",

    // Portal — process tabs
    "portal.process.tab.resumo": "Data",
    "portal.process.tab.evolution": "Progress",
    "portal.process.tab.documents": "Documents",
    "portal.process.tab.pendencias": "Pending items",
    "portal.process.tab.payments": "Payments",
    "portal.process.tab.map": "Location",

    // Portal — process detail
    "portal.process.status.title": "CURRENT STATUS",
    "portal.process.status.lastUpdate": "Last update:",
    "portal.process.dates.title": "DATES",
    "portal.process.dates.start": "Start",
    "portal.process.dates.due": "Total estimated deadline",
    "portal.process.resumo.title": "Project Data",
    "portal.process.resumo.licenseType": "License type",
    "portal.process.resumo.agency": "Licensing agency",
    "portal.process.resumo.processingTime": "Processing time",
    "portal.process.resumo.impactClass": "Impact class",
    "portal.process.resumo.responsibleTech": "Responsible analyst",
    "portal.process.resumo.licensedActivity": "Licensed activity",
    "portal.process.resumo.objective": "Objective",
    "portal.process.resumo.observations": "Notes",
    "portal.process.resumo.cnpj": "CNPJ/CPF",
    "portal.process.resumo.instrument": "Instrument",
    "portal.process.resumo.scope": "Service scope",
    "portal.process.resumo.applicant": "Applicant",
    "portal.process.resumo.clientContact": "Client contact",
    "portal.process.resumo.contactEmail": "Contact email",
    "portal.process.resumo.contactPhone": "Contact phone",
    "portal.process.evolution.title": "PROJECT PROGRESS",
    "portal.process.evolution.empty":
      "No milestones recorded for this project yet.",
    "portal.process.documents.title": "PROJECT DOCUMENTS",
    "portal.process.documents.empty.title": "No documents available",
    "portal.process.documents.empty.description":
      "Your project documents will appear here for download.",
    "portal.process.documents.download": "Download",
    "portal.process.pendencias.title": "PROJECT PENDING ITEMS",
    "portal.process.pendencias.empty.title": "No pending items",
    "portal.process.pendencias.empty.description":
      "This project has no pending items at the moment.",
    "portal.process.pendencias.due": "Due: {date}",
    "portal.process.support.title": "QUESTIONS OR NEED SUPPORT?",
    "portal.process.support.description":
      "Talk directly to the Sustentec Projetos team on WhatsApp.",
    "portal.process.support.cta": "Talk now",
    "portal.process.transparent.title": "TRANSPARENT COMMUNICATION",
    "portal.process.transparent.description":
      "All your project updates in one place.",
    "portal.process.transparent.cta": "More information",

    // Portal — task (pending item) badges
    "portal.task.status.aberta": "Open",
    "portal.task.status.em_andamento": "In progress",
    "portal.task.status.aguardando_cliente": "Awaiting client",
    "portal.task.status.concluida": "Done",
    "portal.task.status.arquivada": "Archived",
    "portal.task.priority.baixa": "Low",
    "portal.task.priority.media": "Medium",
    "portal.task.priority.alta": "High",
    "portal.task.priority.urgente": "Urgent",

    // Portal — map
    "portal.map.title": "Location",
    "portal.map.noCoordinates": "Coordinates not configured",
    "portal.map.dashboardTitle": "Active projects",

    // Portal — project status badge
    "portal.status.andamento": "In progress",
    "portal.status.acompanhamento": "In accompaniment",
    "portal.status.finalizado": "Finalized",

    // Portal — sidebar
    "portal.sidebar.tagline": "Client Portal",
    "portal.sidebar.menu.painel": "Dashboard",
    "portal.sidebar.menu.processos": "My Projects",
    "portal.sidebar.menu.mensagens": "Messages",
    "portal.sidebar.menu.agendamentos": "Scheduling",
    "portal.sidebar.menu.dados": "Account Details",
    "portal.sidebar.tech.heading": "Sustentec-Engenharia responsible engineer",
    "portal.sidebar.tech.whatsapp": "Chat on WhatsApp",
    "portal.sidebar.signOut": "Sign out of Portal",
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
