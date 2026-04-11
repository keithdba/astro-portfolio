import { EventEmitter } from 'node:events';
import type { MessageRecord } from './messaging.model';

export const MESSAGE_EVENTS = {
  CREATED: 'message:created',
  UPDATED: 'message:updated',
  ARCHIVED: 'message:archived',
  DELETED: 'message:deleted',
} as const;

export type MessageEvent = typeof MESSAGE_EVENTS[keyof typeof MESSAGE_EVENTS];

class MessageEventEmitter extends EventEmitter {
  emitCreated(message: MessageRecord) {
    this.emit(MESSAGE_EVENTS.CREATED, message);
  }

  emitUpdated(message: MessageRecord) {
    this.emit(MESSAGE_EVENTS.UPDATED, message);
  }

  emitArchived(message: MessageRecord) {
    this.emit(MESSAGE_EVENTS.ARCHIVED, message);
  }

  emitDeleted(id: string) {
    this.emit(MESSAGE_EVENTS.DELETED, id);
  }
}

export const messageEvents = new MessageEventEmitter();
