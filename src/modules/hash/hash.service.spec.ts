import { Test, TestingModule } from "@nestjs/testing";
import { HashService } from "./hash.service";
import * as argon2 from "argon2";

jest.mock("argon2");

describe("HashService", () => {
  let service: HashService;
  const mockedArgon2 = jest.mocked(argon2);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashService],
    }).compile();

    service = module.get<HashService>(HashService);
    jest.resetAllMocks();
  });

  describe("hash", () => {
    it("should hash a password and return a non-empty string different from input", async () => {
      const input = "plainPassword";
      const hashed = "hashed-value";
      mockedArgon2.hash.mockResolvedValue(hashed);

      const result = await service.hash(input);

      expect(result).toBe(hashed);
      expect(result).not.toBe(input);
      expect(mockedArgon2.hash).toHaveBeenCalledWith(input);
    });
  });

  describe("verify", () => {
    it("should return true for matching password and hash", async () => {
      mockedArgon2.verify.mockResolvedValue(true);

      const result = await service.verify("password", "hashed");

      expect(result).toBe(true);
      expect(mockedArgon2.verify).toHaveBeenCalledWith("password", "hashed");
    });

    it("should return false for non-matching password and hash", async () => {
      mockedArgon2.verify.mockResolvedValue(false);

      const result = await service.verify("wrong", "hashed");

      expect(result).toBe(false);
    });
  });
});
