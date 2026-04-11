import type { MessageRecord } from './messaging.model';

export type PipelineStep = (message: MessageRecord) => Promise<MessageRecord> | MessageRecord;

export class MessagePipeline {
  private steps: PipelineStep[] = [];

  use(step: PipelineStep): this {
    this.steps.push(step);
    return this;
  }

  async process(message: MessageRecord): Promise<MessageRecord> {
    let current = { ...message };
    for (const step of this.steps) {
      current = await step(current);
    }
    return current;
  }
}

/**
 * Global inbound pipeline for all new messages.
 * Hooks can be registered here to perform sentiment analysis,
 * auto-tagging, or security scanning.
 */
export const inboundPipeline = new MessagePipeline();
