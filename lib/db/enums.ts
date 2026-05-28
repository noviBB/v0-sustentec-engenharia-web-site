import { pgEnum } from 'drizzle-orm/pg-core';

export const processStatus = pgEnum('process_status', [
  'andamento',
  'acompanhamento',
  'finalizado',
  'arquivado',
]);

export const processBucket = pgEnum('process_bucket', [
  'andamento',
  'acompanhamento',
  'finalizado',
]);

export const processTipologia = pgEnum('process_tipologia', [
  'licenciamento',
  'consultoria',
  'laudo',
  'monitoramento',
  'outros',
]);

export const processLicenseType = pgEnum('process_license_type', [
  'LP',
  'LI',
  'LO',
  'LAS',
  'LMA',
  'renovacao',
  'outros',
]);

export const processTaskStatus = pgEnum('process_task_status', [
  'aberta',
  'em_andamento',
  'aguardando_cliente',
  'concluida',
  'arquivada',
]);

export const processTaskPriority = pgEnum('process_task_priority', [
  'baixa',
  'media',
  'alta',
  'urgente',
]);

export const appointmentStatus = pgEnum('appointment_status', [
  'agendada',
  'realizada',
  'cancelada',
  'remarcada',
]);

export const messageDirection = pgEnum('message_direction', [
  'inbound',
  'outbound',
]);

export const contactSubmissionStatus = pgEnum('contact_submission_status', [
  'novo',
  'em_atendimento',
  'arquivado',
]);

export const userRole = pgEnum('user_role', ['client', 'staff', 'admin']);

export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'paid',
  'overdue',
]);
