/**
 * Structured logging system with levels
 * Provides consistent logging across the application
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
  private level: LogLevel;
  private module: string;

  constructor(module: string = 'app', level?: LogLevel) {
    this.module = module;
    this.level = level ?? this.getLogLevelFromEnv();
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
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
        return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
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

    if (context) {
      logObject.context = context;
    }

    return JSON.stringify(logObject);
  }

  debug(message: string, context?: LogContext, requestId?: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('debug', message, context, requestId));
    }
  }

  info(message: string, context?: LogContext, requestId?: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('info', message, context, requestId));
    }
  }

  warn(message: string, context?: LogContext, requestId?: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('warn', message, context, requestId));
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
export function createLogger(module: string): Logger {
  return new Logger(module);
}
