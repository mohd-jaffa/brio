type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|password|secret|service[_-]?role|token|temporary|apikey|api[_-]?key)/i;

interface LogRecord {
  level: LogLevel;
  message: string;
  requestId?: string;
  context?: unknown;
  timestamp: string;
}

export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 8) {
    return "[MaxDepth]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? "[Redacted]" : redactSensitive(nested, depth + 1),
      ]),
    );
  }

  return value;
}

function writeLog(level: LogLevel, message: string, context?: unknown, requestId?: string) {
  const record: LogRecord = {
    level,
    message,
    requestId,
    context: context === undefined ? undefined : redactSensitive(context),
    timestamp: new Date().toISOString(),
  };

  const serialized = JSON.stringify(record);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export const logger = {
  info: (message: string, context?: unknown, requestId?: string) =>
    writeLog("info", message, context, requestId),
  warn: (message: string, context?: unknown, requestId?: string) =>
    writeLog("warn", message, context, requestId),
  error: (message: string, context?: unknown, requestId?: string) =>
    writeLog("error", message, context, requestId),
};
