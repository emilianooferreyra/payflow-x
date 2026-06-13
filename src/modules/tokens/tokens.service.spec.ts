import { Test } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { TokensService } from "./tokens.service";
import { AuthorizationTokenEnum } from "../../common/enums/authorization-token.enum";

describe("TokensService", () => {
  let service: TokensService;
  let mockCache: jest.Mocked<{
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  }>;

  beforeEach(async () => {
    mockCache = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
  });

  const userId = "user-1";
  const type = AuthorizationTokenEnum.RECOVERY_PASSWORD;

  // ---------------------------------------------------------------------------
  // generateToken
  // ---------------------------------------------------------------------------
  describe("generateToken", () => {
    it("should generate a 6-digit token and store it in cache", async () => {
      mockCache.set.mockResolvedValue(undefined);

      const token = await service.generateToken({ userId, type });

      expect(token).toMatch(/^\d{6}$/);
      expect(mockCache.set).toHaveBeenCalledWith(
        `token${type}:user:${userId}`,
        { userId, type, token },
        900000,
      );
    });

    it("should use custom TTL when provided", async () => {
      mockCache.set.mockResolvedValue(undefined);

      await service.generateToken({ userId, type, ttl: 300000 });

      expect(mockCache.set).toHaveBeenCalledWith(
        `token${type}:user:${userId}`,
        expect.any(Object),
        300000,
      );
    });

    it("should throw BadRequestException when cache set fails", async () => {
      mockCache.set.mockRejectedValue(new Error("Redis connection lost"));

      await expect(
        service.generateToken({ userId, type }),
      ).rejects.toThrow(BadRequestException);

      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // validateToken
  // ---------------------------------------------------------------------------
  describe("validateToken", () => {
    it("should return payload when token matches", async () => {
      const stored = { userId, type, token: "123456" };
      mockCache.get.mockResolvedValue(stored);

      const result = await service.validateToken({
        userId,
        type,
        token: "123456",
      });

      expect(result).toEqual(stored);
      expect(mockCache.get).toHaveBeenCalledWith(
        `token${type}:user:${userId}`,
      );
    });

    it("should throw UnauthorizedException when token does not match", async () => {
      mockCache.get.mockResolvedValue({
        userId,
        type,
        token: "123456",
      });

      await expect(
        service.validateToken({ userId, type, token: "000000" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when no cached token exists", async () => {
      mockCache.get.mockResolvedValue(null);

      await expect(
        service.validateToken({ userId, type, token: "123456" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw BadRequestException when cache get fails", async () => {
      mockCache.get.mockRejectedValue(new Error("Redis connection lost"));

      await expect(
        service.validateToken({ userId, type, token: "123456" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // revokeToken
  // ---------------------------------------------------------------------------
  describe("revokeToken", () => {
    it("should delete token from cache and return true", async () => {
      mockCache.del.mockResolvedValue(undefined);

      const result = await service.revokeToken({ userId, type });

      expect(result).toBe(true);
      expect(mockCache.del).toHaveBeenCalledWith(
        `token${type}:user:${userId}`,
      );
    });

    it("should throw BadRequestException when cache del fails", async () => {
      mockCache.del.mockRejectedValue(new Error("Redis connection lost"));

      await expect(
        service.revokeToken({ userId, type }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
