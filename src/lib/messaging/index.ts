/**
 * Messaging Module — Barrel Export
 *
 * Public API surface for the local messaging inbox feature.
 */

// Model (schemas, types, constants)
export {
  MessageInputSchema,
  MessageRecordSchema,
  StatusUpdateSchema,
  MESSAGE_STATUS,
  sanitizeInput,
  type MessageInput,
  type MessageInputParsed,
  type MessageRecord,
  type MessageStatus,
  type StatusUpdate,
} from './messaging.model';

// Events & Agentic Pipeline
export { messageEvents, MESSAGE_EVENTS } from './message.events';
export { inboundPipeline, MessagePipeline } from './agent.pipeline';
export { webhookService } from './webhook.service';

// Service (data operations)
export {
  createMessage,
  listMessages,
  getMessageById,
  updateMessageStatus,
  deleteMessage,
  hardDeleteMessage,
  restoreMessage,
} from './messaging.service';

// Controller (HTTP handlers)
export {
  handleSubmitMessage,
  handleListMessages,
  handleGetMessage,
  handleUpdateMessage,
  handleDeleteMessage,
  handleHardDeleteMessage,
  handleRestoreMessage,
} from './messaging.controller';
