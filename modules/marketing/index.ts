/**
 * Marketing feature module — public barrel.
 *
 * Re-exports the controller server action, the marketing section components,
 * and the contact domain result/input types. Consumers should import from
 * `@/modules/marketing` rather than reaching into individual files.
 */

// Controller (server action)
export { submitContact } from './contact.controller';

// Section components
export { Header } from './components/header';
export { HeroSection } from './components/hero-section';
export { StatsSection } from './components/stats-section';
export { ServicesSection } from './components/services-section';
export { TrackerSection } from './components/tracker-section';
export { ValuesSection } from './components/values-section';
export { SupportSection } from './components/support-section';
export { ContactSection } from './components/contact-section';
export { Footer } from './components/footer';

// Domain types
export type {
  ContactSubmissionInput,
  ContactSubmissionResult,
} from './contact.schema';
export { contactSubmissionSchema } from './contact.schema';
