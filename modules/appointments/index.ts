// Public surface of the appointments feature module.

// Controller (server action) — same name/signature as the legacy
// `lib/actions/appointments` export so callers are unaffected.
export { createAppointmentAction } from './appointments.controller';

// Client mutation hook — the frontend's entrypoint to the action.
export { useCreateAppointment } from './hooks/use-create-appointment';

// Appointment row + insert types.
export type { Appointment, NewAppointment } from './appointments.repo';

// Responsible-tech row types.
export type {
  ResponsibleTech,
  ResponsibleTechOption,
} from './responsible-techs.repo';

// Action input/result contracts (the `createAppointmentAction` return type).
export type {
  CreateAppointmentInput,
  CreateAppointmentResult,
} from './appointment.schema';
