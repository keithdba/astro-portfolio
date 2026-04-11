import { messageEvents, MESSAGE_EVENTS } from './message.events';
import type { MessageRecord } from './messaging.model';

interface WebhookConfig {
  url: string;
  secret?: string;
}

/**
 * WebhookService
 * 
 * Future-proof automation trigger. Observes internal message events
 * and dispatches them to configured external HTTP endpoints.
 */
class WebhookService {
  private webhooks: WebhookConfig[] = [];

  constructor() {
    this.initListeners();
  }

  register(config: WebhookConfig) {
    this.webhooks.push(config);
  }

  private initListeners() {
    messageEvents.on(MESSAGE_EVENTS.CREATED, (msg) => this.dispatch('message.created', msg));
    messageEvents.on(MESSAGE_EVENTS.UPDATED, (msg) => this.dispatch('message.updated', msg));
    messageEvents.on(MESSAGE_EVENTS.ARCHIVED, (msg) => this.dispatch('message.archived', msg));
  }

  private async dispatch(event: string, payload: any) {
    for (const webhook of this.webhooks) {
      try {
        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event,
            ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {})
          },
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            payload
          })
        });
      } catch (err) {
        console.error(`[webhook.service] Failed to dispatch to ${webhook.url}:`, err);
      }
    }
  }
}

export const webhookService = new WebhookService();
