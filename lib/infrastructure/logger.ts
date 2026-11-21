/**
 * Structured logging system with levels
 * Always writes to stderr (console.error) so stdio MCP JSON-RPC framing on stdout is never corrupted.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: unknown;
}

export class Logger {
  private explicitLevel?: LogLevel;
  private module: string;

  constructor(module: string = 'app', level?: LogLevel) {
    this.module = module;
    this.explicitLevel = level;
  }

  private getLogLevelFromEnv(): LogLevel {
    const env = typeof process !== 'undefined' && process.env ? process.env : undefined;
    const envLevel = env?.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return env?.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  getLevel(): LogLevel {
    return this.explicitLevel ?? this.getLogLevelFromEnv();
  }

  setLevel(level: LogLevel): void {
    this.explicitLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.getLevel();
  }

  private formatMessage(level: string, message: string, context?: LogContext, requestId?: string): string {
    const timestamp = new Date().toISOString();
    const logObject: Record<string, unknown> = {
      timestamp,
      level,
      module: this.module,
      message,
    };

    if (requestId) {
      logObject.requestId = requestId;
    }

    if (context !== undefined) {
      logObject.context = context;
    }

    try {
      return JSON.stringify(logObject);
    } catch {
      return JSON.stringify({
        timestamp,
        level,
        module: this.module,
        message,
        ...(requestId ? { requestId } : {}),
        contextUnserializable: true,
      });
    }
  }

  debug(message: string, context?: LogContext, requestId?: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.error(this.formatMessage('debug', message, context, requestId));
    }
  }

  info(message: string, context?: LogContext, requestId?: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.error(this.formatMessage('info', message, context, requestId));
    }
  }

  warn(message: string, context?: LogContext, requestId?: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.error(this.formatMessage('warn', message, context, requestId));
    }
  }

  error(message: string, context?: LogContext, requestId?: string): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('error', message, context, requestId));
    }
  }

  // Legacy method for backward compatibility with existing console.error calls
  legacyLog(message: string): void {
    console.error(message);
  }
}

// Default logger instance
export const logger = new Logger('mcp-dadosbr');

// Create logger for specific module
export function createLogger(module: string, level?: LogLevel): Logger {
  return new Logger(module, level);
}
