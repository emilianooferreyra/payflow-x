import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { SessionService } from "../session/session.service";
import { HashService } from "../hash/hash.service";
import { SessionTokenService } from "./session-token.service";
import { makeSession } from "../../common/testing";

jest.mock("../../config", () => ({
  envs: {
    JWT_REFRESH_SECRET: "mocked-refresh-secret",
  },
}));

describe("SessionTokenService", () => {
  let service: SessionTokenService;
  let jwtService: jest.Mocked<JwtService>;
  let hashService: jest.Mocked<HashService>;
  let sessionService: jest.Mocked<SessionService>;

  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  const mockHashService = {
    hash: jest.fn(),
    verify: jest.fn(),
  } as unknown as jest.Mocked<HashService>;

  const mockSessionService = {
    create: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<SessionService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SessionTokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: HashService, useValue: mockHashService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    service = module.get<SessionTokenService>(SessionTokenService);
    jwtService = module.get(JwtService);
    hashService = module.get(HashService);
    sessionService = module.get(SessionService);

    jest.resetAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1.2 — generateTokens
  // ---------------------------------------------------------------------------
  describe("generateTokens", () => {
    it("should call jwtService.sign and jwtService.signAsync with correct payload", async () => {
      mockJwtService.sign.mockReturnValue("mocked-access-token");
      mockJwtService.signAsync.mockResolvedValue("mocked-refresh-token");

      const result = await service.generateTokens("user-1", "session-1");

      expect(result).toEqual({
        accessToken: "mocked-access-token",
        refreshToken: "mocked-refresh-token",
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: "user-1",
        sessionId: "session-1",
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: "user-1", sessionId: "session-1" },
        {
          secret: "mocked-refresh-secret",
          expiresIn: "7d",
        },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 1.5 — setTokenCookies
  // ---------------------------------------------------------------------------
  describe("setTokenCookies", () => {
    it("should set access_token and refresh_token cookies with httpOnly flags", () => {
      const res = { cookie: jest.fn() } as any;

      service.setTokenCookies(res, "access", "refresh");

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenCalledWith("access_token", "access", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });
      expect(res.cookie).toHaveBeenCalledWith("refresh_token", "refresh", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 1.6 — clearTokenCookies
  // ---------------------------------------------------------------------------
  describe("clearTokenCookies", () => {
    it("should clear access_token and refresh_token cookies", () => {
      const res = { clearCookie: jest.fn() } as any;

      service.clearTokenCookies(res);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.clearCookie).toHaveBeenCalledWith("access_token");
      expect(res.clearCookie).toHaveBeenCalledWith("refresh_token");
    });
  });

  // ---------------------------------------------------------------------------
  // 1.3 — createSessionWithTokens (success)
  // ---------------------------------------------------------------------------
  describe("createSessionWithTokens", () => {
    it("should create session, generate tokens, hash refresh, update session, and set cookies", async () => {
      const userId = "user-1";
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      const userAgent = "test-agent";
      const ip = "127.0.0.1";
      const expiresAt = expect.any(Date);

      mockSessionService.create.mockResolvedValue(
        makeSession({ id: "session-1" }),
      );
      mockJwtService.sign.mockReturnValue("mocked-access-token");
      mockJwtService.signAsync.mockResolvedValue("mocked-refresh-token");
      mockHashService.hash.mockResolvedValue("hashed-refresh-token");
      mockSessionService.update.mockResolvedValue(
        makeSession({
          id: "session-1",
          userId,
          refreshToken: "hashed-refresh-token",
        }),
      );

      const result = await service.createSessionWithTokens(
        userId,
        res,
        userAgent,
        ip,
      );

      expect(result.id).toBe("session-1");

      expect(mockSessionService.create).toHaveBeenCalledWith({
        userId,
        refreshToken: "pending",
        userAgent,
        ipAddress: ip,
        expiresAt,
      });

      expect(mockJwtService.signAsync).toHaveBeenCalled();
      expect(mockHashService.hash).toHaveBeenCalledWith("mocked-refresh-token");

      expect(mockSessionService.update).toHaveBeenCalledWith({
        id: "session-1",
        userId,
        refreshToken: "hashed-refresh-token",
      });

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenCalledWith(
        "access_token",
        "mocked-access-token",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "mocked-refresh-token",
        expect.objectContaining({ httpOnly: true }),
      );
    });

    // ---------------------------------------------------------------------------
    // 1.4 — createSessionWithTokens (failure)
    // ---------------------------------------------------------------------------
    it("should throw BadRequestException when session creation fails", async () => {
      mockSessionService.create.mockRejectedValue(
        new Error("DB connection failed"),
      );

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

      await expect(
        service.createSessionWithTokens("user-1", res),
      ).rejects.toThrow(BadRequestException);

      expect(mockSessionService.create).toHaveBeenCalled();
    });
  });
});
