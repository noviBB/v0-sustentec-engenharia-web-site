// Public surface of the messages feature module.
// Controller action (client-callable) + the message row TYPE.
export { markMessageReadAction } from '@/modules/messages/messages.controller';
export { useMarkRead } from '@/modules/messages/hooks/use-mark-read';
export type { MarkMessageReadResult } from '@/modules/messages/messages.controller';
export type { MessageRow } from '@/modules/messages/messages.repo';
