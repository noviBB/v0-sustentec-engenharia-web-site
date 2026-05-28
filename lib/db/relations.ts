import { relations } from 'drizzle-orm';
import {
  appointments,
  clients,
  messages,
  payments,
  processLicenseTypes,
  processMilestoneKinds,
  processMilestones,
  processTasks,
  processes,
  responsibleTechAliases,
  responsibleTechs,
  userClients,
} from './schema';

export const clientsRelations = relations(clients, ({ many }) => ({
  processes: many(processes),
  messages: many(messages),
  appointments: many(appointments),
  user_clients: many(userClients),
}));

export const userClientsRelations = relations(userClients, ({ one }) => ({
  client: one(clients, {
    fields: [userClients.client_id],
    references: [clients.id],
  }),
}));

export const processesRelations = relations(processes, ({ one, many }) => ({
  client: one(clients, {
    fields: [processes.client_id],
    references: [clients.id],
  }),
  responsible_tech: one(responsibleTechs, {
    fields: [processes.responsible_tech_id],
    references: [responsibleTechs.id],
  }),
  tasks: many(processTasks),
  milestones: many(processMilestones),
  license_types: many(processLicenseTypes),
  messages: many(messages),
  appointments: many(appointments),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  process: one(processes, {
    fields: [payments.process_id],
    references: [processes.id],
  }),
}));

export const processLicenseTypesRelations = relations(
  processLicenseTypes,
  ({ one }) => ({
    process: one(processes, {
      fields: [processLicenseTypes.process_id],
      references: [processes.id],
    }),
  }),
);

export const processMilestonesRelations = relations(
  processMilestones,
  ({ one }) => ({
    process: one(processes, {
      fields: [processMilestones.process_id],
      references: [processes.id],
    }),
    kind: one(processMilestoneKinds, {
      fields: [processMilestones.kind_id],
      references: [processMilestoneKinds.id],
    }),
  }),
);

export const processMilestoneKindsRelations = relations(
  processMilestoneKinds,
  ({ many }) => ({
    milestones: many(processMilestones),
  }),
);

export const processTasksRelations = relations(
  processTasks,
  ({ one, many }) => ({
    process: one(processes, {
      fields: [processTasks.process_id],
      references: [processes.id],
    }),
    parent: one(processTasks, {
      fields: [processTasks.parent_task_id],
      references: [processTasks.id],
      relationName: 'process_task_parent',
    }),
    children: many(processTasks, { relationName: 'process_task_parent' }),
  }),
);

export const responsibleTechsRelations = relations(
  responsibleTechs,
  ({ many }) => ({
    processes: many(processes),
    aliases: many(responsibleTechAliases),
  }),
);

export const responsibleTechAliasesRelations = relations(
  responsibleTechAliases,
  ({ one }) => ({
    responsible_tech: one(responsibleTechs, {
      fields: [responsibleTechAliases.responsible_tech_id],
      references: [responsibleTechs.id],
    }),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  client: one(clients, {
    fields: [messages.client_id],
    references: [clients.id],
  }),
  process: one(processes, {
    fields: [messages.process_id],
    references: [processes.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  client: one(clients, {
    fields: [appointments.client_id],
    references: [clients.id],
  }),
  process: one(processes, {
    fields: [appointments.process_id],
    references: [processes.id],
  }),
}));
