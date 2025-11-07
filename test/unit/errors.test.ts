import { describe, it, expect } from "vitest";
import {
  ErrorCode,
  MCPError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  ExternalAPIError,
  TimeoutError,
  NetworkError,
  ConfigurationError,
  ResourceNotFoundError,
  categorizeError,
  formatErrorResponse
} from "../../lib/shared/errors.js";

describe("Error Classes", () => {
  describe("MCPError", () => {
    it("should create error with code and message", () => {
      const error = new MCPError(ErrorCode.INTERNAL_ERROR, "Test error");

      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("MCPError");
    });

    it("should include data when provided", () => {
      const error = new MCPError(ErrorCode.INTERNAL_ERROR, "Test", { foo: "bar" });

      expect(error.data).toEqual({ foo: "bar" });
    });

    it("should serialize to JSON correctly", () => {
      const error = new MCPError(ErrorCode.VALIDATION_ERROR, "Invalid input", { field: "cnpj" });
      const json = error.toJSON();

      expect(json).toEqual({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid input",
        data: { field: "cnpj" }
      });
    });
  });

  describe("ValidationError", () => {
    it("should have correct error code", () => {
      const error = new ValidationError("Invalid CNPJ");

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe("Invalid CNPJ");
      expect(error.name).toBe("ValidationError");
    });

    it("should accept additional data", () => {
      const error = new ValidationError("Invalid", { field: "cep", value: "123" });

      expect(error.data).toEqual({ field: "cep", value: "123" });
    });
  });

  describe("AuthenticationError", () => {
    it("should have default message", () => {
      const error = new AuthenticationError();

      expect(error.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
      expect(error.message).toBe("Authentication failed");
      expect(error.name).toBe("AuthenticationError");
    });

    it("should accept custom message", () => {
      const error = new AuthenticationError("Invalid API key");

      expect(error.message).toBe("Invalid API key");
    });
  });

  describe("RateLimitError", () => {
    it("should have rate limit code and message", () => {
      const error = new RateLimitError();

      expect(error.code).toBe(ErrorCode.RATE_LIMIT_ERROR);
      expect(error.message).toBe("Rate limit exceeded. Please try again later.");
      expect(error.name).toBe("RateLimitError");
    });

    it("should include retry-after data", () => {
      const error = new RateLimitError(60);

      expect(error.data).toEqual({ retryAfter: 60 });
    });
  });

  describe("ExternalAPIError", () => {
    it("should include service and status code", () => {
      const error = new ExternalAPIError("API failed", "OpenCNPJ", 500);

      expect(error.code).toBe(ErrorCode.EXTERNAL_API_ERROR);
      expect(error.message).toBe("API failed");
      expect(error.data).toEqual({ service: "OpenCNPJ", statusCode: 500 });
      expect(error.name).toBe("ExternalAPIError");
    });
  });

  describe("TimeoutError", () => {
    it("should format timeout message", () => {
      const error = new TimeoutError("fetchCNPJ", 8000);

      expect(error.code).toBe(ErrorCode.TIMEOUT_ERROR);
      expect(error.message).toBe("Operation 'fetchCNPJ' timed out after 8000ms");
      expect(error.name).toBe("TimeoutError");
    });
  });

  describe("NetworkError", () => {
    it("should have network error code", () => {
      const error = new NetworkError("Connection refused");

      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.message).toBe("Connection refused");
      expect(error.name).toBe("NetworkError");
    });
  });

  describe("ConfigurationError", () => {
    it("should include configuration details", () => {
      const error = new ConfigurationError("Invalid URL", { url: "invalid" });

      expect(error.code).toBe(ErrorCode.CONFIGURATION_ERROR);
      expect(error.data).toEqual({ url: "invalid" });
    });
  });

  describe("ResourceNotFoundError", () => {
    it("should format not found message", () => {
      const error = new ResourceNotFoundError("CNPJ", "12345678000190");

      expect(error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(error.message).toBe("CNPJ not found: 12345678000190");
      expect(error.data).toEqual({ resource: "CNPJ", identifier: "12345678000190" });
    });
  });
});

describe("categorizeError", () => {
  it("should return MCPError unchanged", () => {
    const original = new ValidationError("Test");
    const categorized = categorizeError(original);

    expect(categorized).toBe(original);
  });

  it("should categorize timeout errors", () => {
    const error = new Error("Operation timed out after 5000ms");
    const categorized = categorizeError(error);

    expect(categorized).toBeInstanceOf(TimeoutError);
    expect(categorized.code).toBe(ErrorCode.TIMEOUT_ERROR);
  });

  it("should categorize rate limit errors", () => {
    const error = new Error("Rate limit exceeded");
    const categorized = categorizeError(error);

    expect(categorized).toBeInstanceOf(RateLimitError);
    expect(categorized.code).toBe(ErrorCode.RATE_LIMIT_ERROR);
  });

  it("should categorize network errors", () => {
    const error = new Error("Network connection failed: ECONNREFUSED");
    const categorized = categorizeError(error);

    expect(categorized).toBeInstanceOf(NetworkError);
    expect(categorized.code).toBe(ErrorCode.NETWORK_ERROR);
  });

  it("should categorize authentication errors", () => {
    const error = new Error("Unauthorized: Invalid API key");
    const categorized = categorizeError(error);

    expect(categorized).toBeInstanceOf(AuthenticationError);
    expect(categorized.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
  });

  it("should categorize validation errors", () => {
    const error = new Error("Invalid CNPJ: must be 14 digits");
    const categorized = categorizeError(error);

    expect(categorized).toBeInstanceOf(ValidationError);
    expect(categorized.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it("should categorize not found errors", () => {
    const error = new Error("Resource not found: 404");
    const categorized = categorizeError(error);

    expect(categorized).toBeInstanceOf(ResourceNotFoundError);
    expect(categorized.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });

  it("should default to external API error for unknown errors", () => {
    const error = new Error("Something went wrong");
    const categorized = categorizeError(error);

    expect(categorized).toBeInstanceOf(ExternalAPIError);
    expect(categorized.code).toBe(ErrorCode.EXTERNAL_API_ERROR);
  });

  it("should handle non-Error objects", () => {
    const categorized = categorizeError("string error");

    expect(categorized).toBeInstanceOf(MCPError);
    expect(categorized.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(categorized.message).toBe("An unexpected error occurred");
  });
});

describe("formatErrorResponse", () => {
  it("should format MCP error correctly", () => {
    const error = new ValidationError("Invalid input", { field: "cnpj" });
    const formatted = formatErrorResponse(error);

    expect(formatted).toEqual({
      code: ErrorCode.VALIDATION_ERROR,
      message: "Invalid input",
      data: { field: "cnpj" }
    });
  });

  it("should format generic error", () => {
    const error = new Error("API timeout");
    const formatted = formatErrorResponse(error);

    expect(formatted.code).toBe(ErrorCode.TIMEOUT_ERROR);
    expect(formatted.message).toContain("timed out");
  });

  it("should handle non-Error objects", () => {
    const formatted = formatErrorResponse(null);

    expect(formatted.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(formatted.message).toBe("An unexpected error occurred");
  });
});
