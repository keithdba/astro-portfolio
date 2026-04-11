import { inboundPipeline } from './agent.pipeline';
import type { MessageRecord } from './messaging.model';

/**
 * Example agent hook: Auto-priority detection
 */
export async function detectPriorityHook(message: MessageRecord): Promise<MessageRecord> {
  const body = message.message_body.toLowerCase();
  let priority: 'low' | 'medium' | 'high' = 'medium';

  if (body.includes('urgent') || body.includes('immediately') || body.includes('asap')) {
    priority = 'high';
  } else if (body.includes('newsletter') || body.includes('thanks')) {
    priority = 'low';
  }

  return {
    ...message,
    ai_insights: {
      ...message.ai_insights,
      priority
    }
  };
}

/**
 * Example agent hook: Basic sentiment analysis
 */
export async function analyzeSentimentHook(message: MessageRecord): Promise<MessageRecord> {
  const body = message.message_body.toLowerCase();
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

  const positiveWords = ['great', 'love', 'hired', 'portfolio', 'excellent'];
  const negativeWords = ['bad', 'poor', 'issue', 'problem', 'error'];

  if (positiveWords.some(w => body.includes(w))) sentiment = 'positive';
  else if (negativeWords.some(w => body.includes(w))) sentiment = 'negative';

  return {
    ...message,
    ai_insights: {
      ...message.ai_insights,
      sentiment
    }
  };
}

// Register default hooks
inboundPipeline.use(detectPriorityHook);
inboundPipeline.use(analyzeSentimentHook);
