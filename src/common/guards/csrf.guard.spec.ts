import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SKIP_CSRF_KEY } from "../decorators/skip-csrf.decorator";

const mockValidateRequest = jest.fn();

jest.mock("csrf-csrf", () => ({
  doubleCsrf: jest.fn(() => ({
    validateRequest: mockValidateRequest,
    generateCsrfToken: jest.fn(() => "mocked-token"),
  })),
}));

jest.mock("../../config", () => ({
  envs: {
    CSRF_ENABLED: true,
    CSRF_SECRET: "test-csrf-secret",
  },
}));

import { CsrfGuard } from "./csrf.guard";

describe("CsrfGuard", () => {
  let guard: CsrfGuard;
  let reflector: Reflector;

  const createContext = () =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          cookies: {},
          ip: "127.0.0.1",
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new CsrfGuard(reflector);
    mockValidateRequest.mockReset();
  });

  it("should allow request when @SkipCsrf() is present", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it("should allow request when CSRF token is valid", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    mockValidateRequest.mockReturnValue(true);
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it("should throw ForbiddenException when CSRF token is invalid", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    mockValidateRequest.mockReturnValue(false);
    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
  });

  it("should check handler and class metadata for SkipCsrf", () => {
    const spy = jest.spyOn(reflector, "getAllAndOverride");
    mockValidateRequest.mockReturnValue(true);
    guard.canActivate(createContext());
    expect(spy).toHaveBeenCalledWith(SKIP_CSRF_KEY, [
      expect.any(Object),
      expect.any(Object),
    ]);
  });
});

describe("CsrfGuard when CSRF_ENABLED is false", () => {
  it("should allow all requests", () => {
    jest.isolateModules(() => {
      const innerValidateRequest = jest.fn();
      jest.mock("csrf-csrf", () => ({
        doubleCsrf: jest.fn(() => ({
          validateRequest: innerValidateRequest,
          generateCsrfToken: jest.fn(),
        })),
      }));
      jest.mock("../../config", () => ({
        envs: { CSRF_ENABLED: false, CSRF_SECRET: "test" },
      }));
      const { CsrfGuard: Guard } = require("./csrf.guard");
      const g = new Guard(new Reflector());
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
            cookies: {},
            ip: "127.0.0.1",
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;
      expect(g.canActivate(ctx)).toBe(true);
      expect(innerValidateRequest).not.toHaveBeenCalled();
    });
  });
});
