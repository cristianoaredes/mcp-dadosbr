/**
 * JSON-RPC 2.0 Error Codes
 * Standard codes: -32768 to -32000 are reserved
 * Application codes: -32000 to -32099 are server errors
 */

export enum ErrorCode {
  // Standard JSON-RPC errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // Custom application errors (-32000 to -32099)
  VALIDATION_ERROR = -32001,
  AUTHENTICATION_ERROR = -32002,
  RATE_LIMIT_ERROR = -32003,
  EXTERNAL_API_ERROR = -32004,
  TIMEOUT_ERROR = -32005,
  NETWORK_ERROR = -32006,
  CONFIGURATION_ERROR = -32007,
  RESOURCE_NOT_FOUND = -32008,
}

/**
 * Base error class for MCP errors
 */
export class MCPError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "MCPError";
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    };
  }
}

/**
 * Validation error - invalid input parameters
 */
export class ValidationError extends MCPError {
  constructor(message: string, data?: unknown) {
    super(ErrorCode.VALIDATION_ERROR, message, data);
    this.name = "ValidationError";
  }
}

/**
 * Authentication error - invalid credentials or unauthorized
 */
export class AuthenticationError extends MCPError {
  constructor(message: string = "Authentication failed") {
    super(ErrorCode.AUTHENTICATION_ERROR, message);
    this.name = "AuthenticationError";
  }
}

/**
 * Rate limit error - too many requests
 */
export class RateLimitError extends MCPError {
  constructor(retryAfter?: number) {
    super(
      ErrorCode.RATE_LIMIT_ERROR,
      "Rate limit exceeded. Please try again later.",
      { retryAfter }
    );
    this.name = "RateLimitError";
  }
}

/**
 * External API error - error from external service
 */
export class ExternalAPIError extends MCPError {
  constructor(message: string, service?: string, statusCode?: number) {
    super(
      ErrorCode.EXTERNAL_API_ERROR,
      message,
      { service, statusCode }
    );
    this.name = "ExternalAPIError";
  }
}

/**
 * Timeout error - operation took too long
 */
export class TimeoutError extends MCPError {
  constructor(operation: string, timeoutMs: number) {
    super(
      ErrorCode.TIMEOUT_ERROR,
      `Operation '${operation}' timed out after ${timeoutMs}ms`
    );
    this.name = "TimeoutError";
  }
}

/**
 * Network error - connection or network issues
 */
export class NetworkError extends MCPError {
  constructor(message: string) {
    super(ErrorCode.NETWORK_ERROR, message);
    this.name = "NetworkError";
  }
}

/**
 * Configuration error - invalid configuration
 */
export class ConfigurationError extends MCPError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.CONFIGURATION_ERROR, message, details);
    this.name = "ConfigurationError";
  }
}

/**
 * Resource not found error
 */
export class ResourceNotFoundError extends MCPError {
  constructor(resource: string, identifier: string) {
    super(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resource} not found: ${identifier}`,
      { resource, identifier }
    );
    this.name = "ResourceNotFoundError";
  }
}

/**
 * Categorize generic errors into specific error types
 */
export function categorizeError(error: Error | unknown): MCPError {
  if (error instanceof MCPError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Categorize by error message patterns
    if (message.includes("timeout") || message.includes("timed out")) {
      return new TimeoutError("operation", 30000);
    }

    if (message.includes("rate limit") || message.includes("too many requests")) {
      return new RateLimitError();
    }

    if (
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("econnrefused") ||
      message.includes("enotfound")
    ) {
      return new NetworkError(error.message);
    }

    if (
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("authentication") ||
      message.includes("api key")
    ) {
      return new AuthenticationError(error.message);
    }

    if (
      message.includes("invalid") ||
      message.includes("validation") ||
      message.includes("must be")
    ) {
      return new ValidationError(error.message);
    }

    if (message.includes("not found") || message.includes("404")) {
      return new ResourceNotFoundError("resource", "unknown");
    }

    // Default to external API error if not categorized
    return new ExternalAPIError(error.message);
  }

  // Unknown error type
  return new MCPError(
    ErrorCode.INTERNAL_ERROR,
    "An unexpected error occurred",
    { originalError: String(error) }
  );
}

/**
 * Format error for JSON-RPC response
 */
export function formatErrorResponse(error: Error | unknown) {
  const mcpError = categorizeError(error);

  return {
    code: mcpError.code,
    message: mcpError.message,
    data: mcpError.data
  };
}
