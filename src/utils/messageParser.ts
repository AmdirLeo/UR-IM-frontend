export interface ParsedMessage {
  content: string;
  extra: Record<string, any>;
}

export const parseMessageContent = (content: unknown, existingExtra?: unknown): ParsedMessage => {
  let parsedContentStr = content;
  let parsedExtra = existingExtra || {};

  if (typeof content === 'string') {
    try {
      const parsedObj = JSON.parse(content);
      if (parsedObj.extra) {
        parsedExtra = { ...parsedExtra, ...parsedObj.extra };
      }
      if (parsedObj.content) {
        parsedContentStr = parsedObj.content;
      }
    } catch (e) {
      // Content is a plain string, which is fine
      parsedContentStr = content;
    }
  }

  return {
    content: typeof parsedContentStr === 'string' ? parsedContentStr : '',
    extra: parsedExtra
  };
};
