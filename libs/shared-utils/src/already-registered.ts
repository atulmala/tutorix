export const ALREADY_REGISTERED_LOGIN_MESSAGE =
  'You are already registered. Pl login';

function collectErrorMessages(source: unknown): string[] {
  if (!source) {
    return [];
  }
  if (typeof source === 'string') {
    return [source];
  }
  if (Array.isArray(source)) {
    return source.flatMap((item) => collectErrorMessages(item));
  }
  if (typeof source !== 'object') {
    return [];
  }

  const value = source as {
    message?: string;
    graphQLErrors?: Array<{ message?: string }>;
    errors?: Array<{ message?: string }>;
  };
  const messages: string[] = [];

  for (const err of value.graphQLErrors ?? []) {
    if (err?.message) {
      messages.push(err.message);
    }
  }
  for (const err of value.errors ?? []) {
    if (err?.message) {
      messages.push(err.message);
    }
  }
  if (value.message) {
    messages.push(value.message);
  }

  return messages;
}

export function isAlreadyRegisteredError(source: unknown): boolean {
  return collectErrorMessages(source).some((message) =>
    /already registered/i.test(message),
  );
}
