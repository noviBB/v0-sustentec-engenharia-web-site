import { pgEnum } from 'drizzle-orm/pg-core';
import { enumValues } from './enum-bridge';

export enum ProcessStatus {
  Andamento = 'andamento',
  Acompanhamento = 'acompanhamento',
  Finalizado = 'finalizado',
  Arquivado = 'arquivado',
}

export enum ProcessBucket {
  Andamento = 'andamento',
  Acompanhamento = 'acompanhamento',
  Finalizado = 'finalizado',
}

export enum ProcessTipologia {
  Licenciamento = 'licenciamento',
  Consultoria = 'consultoria',
  Laudo = 'laudo',
  Monitoramento = 'monitoramento',
  Outros = 'outros',
}

export enum ProcessLicenseType {
  LP = 'LP',
  LI = 'LI',
  LO = 'LO',
  LAS = 'LAS',
  LMA = 'LMA',
  Renovacao = 'renovacao',
  Outros = 'outros',
}

export enum ProcessTaskStatus {
  Aberta = 'aberta',
  EmAndamento = 'em_andamento',
  AguardandoCliente = 'aguardando_cliente',
  Concluida = 'concluida',
  Arquivada = 'arquivada',
}

export enum ProcessTaskPriority {
  Baixa = 'baixa',
  Media = 'media',
  Alta = 'alta',
  Urgente = 'urgente',
}

export enum AppointmentStatus {
  Agendada = 'agendada',
  Realizada = 'realizada',
  Cancelada = 'cancelada',
  Remarcada = 'remarcada',
}

export enum MessageDirection {
  Inbound = 'inbound',
  Outbound = 'outbound',
}

export enum ContactSubmissionStatus {
  Novo = 'novo',
  EmAtendimento = 'em_atendimento',
  Arquivado = 'arquivado',
}

export enum UserRole {
  Client = 'client',
  Staff = 'staff',
  Admin = 'admin',
}

export enum PaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  Overdue = 'overdue',
}

export const processStatus = pgEnum('process_status', enumValues(ProcessStatus));

export const processBucket = pgEnum('process_bucket', enumValues(ProcessBucket));

export const processTipologia = pgEnum(
  'process_tipologia',
  enumValues(ProcessTipologia),
);

export const processLicenseType = pgEnum(
  'process_license_type',
  enumValues(ProcessLicenseType),
);

export const processTaskStatus = pgEnum(
  'process_task_status',
  enumValues(ProcessTaskStatus),
);

export const processTaskPriority = pgEnum(
  'process_task_priority',
  enumValues(ProcessTaskPriority),
);

export const appointmentStatus = pgEnum(
  'appointment_status',
  enumValues(AppointmentStatus),
);

export const messageDirection = pgEnum(
  'message_direction',
  enumValues(MessageDirection),
);

export const contactSubmissionStatus = pgEnum(
  'contact_submission_status',
  enumValues(ContactSubmissionStatus),
);

export const userRole = pgEnum('user_role', enumValues(UserRole));

export const paymentStatus = pgEnum('payment_status', enumValues(PaymentStatus));
