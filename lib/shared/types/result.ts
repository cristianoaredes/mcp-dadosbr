/**
 * Result Type for functional error handling
 * Replaces throwing exceptions with explicit success/error states
 */

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export namespace Result {
  export function ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  }

  export function err<E>(error: E): Result<never, E> {
    return { ok: false, error };
  }

  export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
    return result.ok === true;
  }

  export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
    return result.ok === false;
  }

  export function map<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => U
  ): Result<U, E> {
    return result.ok ? ok(fn(result.value)) : result;
  }

  export function mapErr<T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F
  ): Result<T, F> {
    return result.ok ? result : err(fn(result.error));
  }

  export function flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
  ): Result<U, E> {
    return result.ok ? fn(result.value) : result;
  }

  export function unwrap<T, E>(result: Result<T, E>): T {
    if (result.ok) return result.value;
    throw new Error(`Called unwrap on an error: ${result.error}`);
  }

  export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.ok ? result.value : defaultValue;
  }

  export function match<T, E, R>(
    result: Result<T, E>,
    handlers: {
      ok: (value: T) => R;
      err: (error: E) => R;
    }
  ): R {
    return result.ok ? handlers.ok(result.value) : handlers.err(result.error);
  }

  // Convert from Promise to Result
  export async function fromPromise<T>(
    promise: Promise<T>
  ): Promise<Result<T, Error>> {
    try {
      const value = await promise;
      return ok(value);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Combine multiple Results
  export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];
    for (const result of results) {
      if (!result.ok) return result;
      values.push(result.value);
    }
    return ok(values);
  }
}

// Domain-specific error types
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(
    message: string,
    public resource?: string
  ) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public timeoutMs?: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}
