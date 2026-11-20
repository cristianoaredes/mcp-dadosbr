import { TIMEOUTS } from "../../config/timeouts.js";
import { TimeoutError } from "../types/result.js";

/**
 * Check whether an unknown error represents an AbortController or Timeout failure.
 */
export function isAbortOrTimeoutError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const name = (error as { name?: unknown }).name;
  return name === "AbortError" || name === "TimeoutError";
}

export interface LinkedAbortController {
  signal: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
  wasAbortedByParent: () => boolean;
}

/**
 * Create an AbortController bounded by timeoutMs and optionally linked to a parent AbortSignal.
 * Uses controller.abort() without a non-standard reason argument for Node and Workers compatibility.
 */
export function createTimeoutController(
  timeoutMs: number,
  parentSignal?: AbortSignal,
): LinkedAbortController {
  const effectiveTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : TIMEOUTS.HTTP_REQUEST_MS;
  const controller = new AbortController();
  let timedOut = false;
  let abortedByParent = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (parentSignal?.aborted) {
    abortedByParent = true;
    controller.abort();
    return {
      signal: controller.signal,
      cleanup: () => {},
      didTimeout: () => false,
      wasAbortedByParent: () => true,
    };
  }

  const cleanupTimer = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  const onParentAbort = () => {
    abortedByParent = true;
    cleanupTimer();
    controller.abort();
  };

  if (parentSignal) {
    parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }

  timeoutId = setTimeout(() => {
    timeoutId = undefined;
    timedOut = true;
    controller.abort();
  }, effectiveTimeoutMs);

  const cleanup = () => {
    cleanupTimer();
    if (parentSignal) {
      parentSignal.removeEventListener("abort", onParentAbort);
    }
  };

  return {
    signal: controller.signal,
    cleanup,
    didTimeout: () => timedOut,
    wasAbortedByParent: () => abortedByParent,
  };
}

/**
 * Race a promise (such as an SDK call without AbortSignal support) against a timeout and optional parent signal.
 * Attaches a no-op catch handler to the underlying promise to prevent unhandled rejections if timeout wins.
 */
export async function raceWithTimeoutAndSignal<T>(
  promise: Promise<T>,
  timeoutMs: number,
  parentSignal?: AbortSignal,
  label: string = "Operation",
): Promise<T> {
  const effectiveTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : TIMEOUTS.HTTP_REQUEST_MS;

  // Prevent UnhandledPromiseRejection if the underlying promise rejects after timeout/abort wins.
  promise.catch(() => {});

  if (parentSignal?.aborted) {
    throw new TimeoutError(`${label} aborted`, effectiveTimeoutMs);
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let onParentAbort: (() => void) | undefined;

  const guardPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      reject(new TimeoutError(`${label} timed out after ${effectiveTimeoutMs}ms`, effectiveTimeoutMs));
    }, effectiveTimeoutMs);

    if (parentSignal) {
      onParentAbort = () => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        reject(new TimeoutError(`${label} aborted`, effectiveTimeoutMs));
      };
      parentSignal.addEventListener("abort", onParentAbort, { once: true });
    }
  });

  try {
    return await Promise.race([promise, guardPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    if (parentSignal && onParentAbort) {
      parentSignal.removeEventListener("abort", onParentAbort);
    }
  }
}
