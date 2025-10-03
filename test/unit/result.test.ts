/**
 * Result Type Unit Tests
 * Tests functional error handling helpers
 */

import { describe, it, expect } from 'vitest';
import { Result, ValidationError, NotFoundError, RateLimitError, NetworkError, TimeoutError } from '../../lib/shared/types/result';

describe('Result Type', () => {
    describe('Construction', () => {
        it('should create ok result', () => {
            const result = Result.ok('value');
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toBe('value');
            }
        });

        it('should create err result', () => {
            const error = new Error('test error');
            const result = Result.err(error);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe(error);
            }
        });
    });

    describe('Type guards', () => {
        it('isOk should narrow type correctly', () => {
            const result = Result.ok(42);
            if (Result.isOk(result)) {
                expect(result.value).toBe(42);
            }
        });

        it('isErr should narrow type correctly', () => {
            const result = Result.err(new Error('test'));
            if (Result.isErr(result)) {
                expect(result.error.message).toBe('test');
            }
        });
    });

    describe('map', () => {
        it('should transform ok value', () => {
            const result = Result.ok(10);
            const mapped = Result.map(result, x => x * 2);

            expect(Result.isOk(mapped)).toBe(true);
            if (Result.isOk(mapped)) {
                expect(mapped.value).toBe(20);
            }
        });

        it('should pass through error', () => {
            const error = new Error('test');
            const result = Result.err(error);
            const mapped = Result.map(result, x => x * 2);

            expect(Result.isErr(mapped)).toBe(true);
            if (Result.isErr(mapped)) {
                expect(mapped.error).toBe(error);
            }
        });
    });

    describe('mapErr', () => {
        it('should transform error', () => {
            const result = Result.err(new Error('original'));
            const mapped = Result.mapErr(result, e => new Error(`wrapped: ${e.message}`));

            expect(Result.isErr(mapped)).toBe(true);
            if (Result.isErr(mapped)) {
                expect(mapped.error.message).toBe('wrapped: original');
            }
        });

        it('should pass through ok value', () => {
            const result = Result.ok(42);
            const mapped = Result.mapErr(result, e => new Error('should not happen'));

            expect(Result.isOk(mapped)).toBe(true);
            if (Result.isOk(mapped)) {
                expect(mapped.value).toBe(42);
            }
        });
    });

    describe('flatMap', () => {
        it('should chain ok results', () => {
            const result = Result.ok(10);
            const chained = Result.flatMap(result, x => Result.ok(x * 2));

            expect(Result.isOk(chained)).toBe(true);
            if (Result.isOk(chained)) {
                expect(chained.value).toBe(20);
            }
        });

        it('should short-circuit on error', () => {
            const error = new Error('test');
            const result = Result.err(error);
            const chained = Result.flatMap(result, x => Result.ok(x * 2));

            expect(Result.isErr(chained)).toBe(true);
            if (Result.isErr(chained)) {
                expect(chained.error).toBe(error);
            }
        });

        it('should propagate inner error', () => {
            const result = Result.ok(10);
            const chained = Result.flatMap(result, x => Result.err(new Error('inner error')));

            expect(Result.isErr(chained)).toBe(true);
            if (Result.isErr(chained)) {
                expect(chained.error.message).toBe('inner error');
            }
        });
    });

    describe('unwrap', () => {
        it('should extract ok value', () => {
            const result = Result.ok(42);
            expect(Result.unwrap(result)).toBe(42);
        });

        it('should throw on error', () => {
            const result = Result.err(new Error('test'));
            expect(() => Result.unwrap(result)).toThrow('Called unwrap on an error');
        });
    });

    describe('unwrapOr', () => {
        it('should extract ok value', () => {
            const result = Result.ok(42);
            expect(Result.unwrapOr(result, 0)).toBe(42);
        });

        it('should return default on error', () => {
            const result = Result.err(new Error('test'));
            expect(Result.unwrapOr(result, 99)).toBe(99);
        });
    });

    describe('match', () => {
        it('should call ok handler on ok result', () => {
            const result = Result.ok(42);
            const matched = Result.match(result, {
                ok: value => `Success: ${value}`,
                err: (error: any) => `Error: ${error.message}`
            });

            expect(matched).toBe('Success: 42');
        });

        it('should call err handler on error result', () => {
            const result = Result.err(new Error('test error'));
            const matched = Result.match(result, {
                ok: value => `Success: ${value}`,
                err: (error: any) => `Error: ${error.message}`
            });

            expect(matched).toBe('Error: test error');
        });
    });

    describe('fromPromise', () => {
        it('should convert resolved promise to ok', async () => {
            const promise = Promise.resolve(42);
            const result = await Result.fromPromise(promise);

            expect(Result.isOk(result)).toBe(true);
            if (Result.isOk(result)) {
                expect(result.value).toBe(42);
            }
        });

        it('should convert rejected promise to err', async () => {
            const promise = Promise.reject(new Error('failed'));
            const result = await Result.fromPromise(promise);

            expect(Result.isErr(result)).toBe(true);
            if (Result.isErr(result)) {
                expect(result.error.message).toBe('failed');
            }
        });

        it('should wrap non-Error rejections', async () => {
            const promise = Promise.reject('string error');
            const result = await Result.fromPromise(promise);

            expect(Result.isErr(result)).toBe(true);
            if (Result.isErr(result)) {
                expect(result.error).toBeInstanceOf(Error);
                expect(result.error.message).toBe('string error');
            }
        });
    });

    describe('all', () => {
        it('should combine all ok results', () => {
            const results = [
                Result.ok(1),
                Result.ok(2),
                Result.ok(3)
            ];

            const combined = Result.all(results);

            expect(Result.isOk(combined)).toBe(true);
            if (Result.isOk(combined)) {
                expect(combined.value).toEqual([1, 2, 3]);
            }
        });

        it('should return first error', () => {
            const error1 = new Error('error 1');
            const error2 = new Error('error 2');

            const results = [
                Result.ok(1),
                Result.err(error1),
                Result.err(error2)
            ];

            const combined = Result.all(results);

            expect(Result.isErr(combined)).toBe(true);
            if (Result.isErr(combined)) {
                expect(combined.error).toBe(error1);
            }
        });

        it('should handle empty array', () => {
            const combined = Result.all([]);

            expect(Result.isOk(combined)).toBe(true);
            if (Result.isOk(combined)) {
                expect(combined.value).toEqual([]);
            }
        });
    });

    describe('Domain Errors', () => {
        it('should create ValidationError', () => {
            const error = new ValidationError('Invalid input', 'email');

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('ValidationError');
            expect(error.message).toBe('Invalid input');
            expect(error.field).toBe('email');
        });

        it('should create NotFoundError', () => {
            const error = new NotFoundError('Resource not found', 'user');

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('NotFoundError');
            expect(error.resource).toBe('user');
        });

        it('should create RateLimitError', () => {
            const error = new RateLimitError('Too many requests', 5000);

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('RateLimitError');
            expect(error.retryAfter).toBe(5000);
        });

        it('should create NetworkError', () => {
            const error = new NetworkError('Connection failed', 500);

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('NetworkError');
            expect(error.statusCode).toBe(500);
        });

        it('should create TimeoutError', () => {
            const error = new TimeoutError('Request timed out', 5000);

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('TimeoutError');
            expect(error.timeoutMs).toBe(5000);
        });
    });
});
