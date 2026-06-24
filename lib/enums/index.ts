export enum ResultKind {
  Ok = 'ok',
  NotFound = 'not_found',
  Error = 'error',
  DoubleBooked = 'double_booked',
  Unauthorized = 'unauthorized',
}

export enum Language {
  Pt = 'pt',
  En = 'en',
}

export enum EmailProvider {
  Smtp = 'smtp',
  Resend = 'resend',
}

export enum DbMode {
  Service = 'service',
  Anon = 'anon',
  Rls = 'rls',
  Tx = 'tx',
}

export enum PortalView {
  Painel = 'painel',
  Processos = 'processos',
  ProcessoDetalhe = 'processo-detalhe',
  Mensagens = 'mensagens',
  Agendamentos = 'agendamentos',
  Dados = 'dados',
}

export enum ProcessTab {
  Resumo = 'resumo',
  Evolucao = 'evolucao',
  Pendencias = 'pendencias',
  Documentos = 'documentos',
  Pagamentos = 'pagamentos',
  Mapa = 'mapa',
}
