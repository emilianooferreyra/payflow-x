import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { RecaptchaGuard } from "./recaptcha.guard";
import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

const createMockContext = (overrides: Partial<Request> = {}): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () =>
        ({
          ip: "127.0.0.1",
          socket: { remoteAddress: "127.0.0.1" },
          headers: {},
          body: {},
          ...overrides,
        }) as Request,
    }),
  }) as unknown as ExecutionContext;

describe("RecaptchaGuard", () => {
  let guard: RecaptchaGuard;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.RECAPTCHA_SECRET_KEY;
    delete process.env.RECAPTCHA_THRESHOLD;
    process.env.NODE_ENV = "development";
    guard = new RecaptchaGuard();
    mockFetch.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("local IP bypass", () => {
    it.each(["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost", "10.0.0.5", "192.168.1.1", "172.16.0.1", "172.31.255.255"])(
      "should bypass for local IP %s",
      async (ip) => {
        const context = createMockContext({ ip });
        await expect(guard.canActivate(context)).resolves.toBe(true);
      },
    );

    it("should NOT bypass for public IP", async () => {
      process.env.RECAPTCHA_SECRET_KEY = "test-key";
      guard = new RecaptchaGuard();
      const context = createMockContext({ ip: "8.8.8.8", body: { recaptchaToken: "test-token" } });
      mockFetch.mockResolvedValue({ json: async () => ({ success: true, score: 0.1 }) });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("missing token", () => {
    it("should throw BadRequestException when token is missing", async () => {
      process.env.RECAPTCHA_SECRET_KEY = "test-key";
      guard = new RecaptchaGuard();
      const context = createMockContext({ ip: "8.8.8.8", body: {} });
      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });
  });

  describe("low score rejection", () => {
    beforeEach(() => {
      process.env.RECAPTCHA_SECRET_KEY = "test-key";
      guard = new RecaptchaGuard();
    });

    it("should throw ForbiddenException when score is below threshold", async () => {
      mockFetch.mockResolvedValue({ json: async () => ({ success: true, score: 0.3 }) });

      const context = createMockContext({
        ip: "8.8.8.8",
        body: { recaptchaToken: "valid-token" },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it("should pass when score meets threshold", async () => {
      mockFetch.mockResolvedValue({ json: async () => ({ success: true, score: 0.7 }) });

      const context = createMockContext({
        ip: "8.8.8.8",
        body: { recaptchaToken: "valid-token" },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe("API failure", () => {
    it("should return false when Google API is unreachable", async () => {
      process.env.RECAPTCHA_SECRET_KEY = "test-key";
      guard = new RecaptchaGuard();

      mockFetch.mockRejectedValue(new Error("Network error"));

      const context = createMockContext({
        ip: "8.8.8.8",
        body: { recaptchaToken: "valid-token" },
      });

      await expect(guard.canActivate(context)).resolves.toBe(false);
    });
  });

  describe("production fail-fast in onModuleInit", () => {
    it("should throw when NODE_ENV=production and key missing", () => {
      process.env.NODE_ENV = "production";
      delete process.env.RECAPTCHA_SECRET_KEY;
      guard = new RecaptchaGuard();
      expect(() => guard.onModuleInit()).toThrow("ReCAPTCHA is misconfigured in production");
    });

    it("should NOT throw when production and key is present", () => {
      process.env.NODE_ENV = "production";
      process.env.RECAPTCHA_SECRET_KEY = "prod-key";
      guard = new RecaptchaGuard();
      expect(() => guard.onModuleInit()).not.toThrow();
    });
  });
});
