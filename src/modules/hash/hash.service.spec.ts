import { Test, TestingModule } from "@nestjs/testing";
import { HashService } from "./hash.service";
import * as argon2 from "argon2";

jest.mock("argon2");

describe("HashService", () => {
  let service: HashService;
  let mockedArgon2: jest.Mocked<typeof argon2>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashService],
    }).compile();

    service = module.get<HashService>(HashService);
    mockedArgon2 = jest.mocked(argon2);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("hash", () => {
    it("should call argon2.hash with the given input", async () => {
      mockedArgon2.hash.mockResolvedValue("hashed-value");

      const result = await service.hash("test");

      expect(result).toBe("hashed-value");
      expect(mockedArgon2.hash).toHaveBeenCalledWith("test");
    });

    it("should propagate argon2 errors", async () => {
      const error = new Error("argon2 error");
      mockedArgon2.hash.mockRejectedValue(error);

      await expect(service.hash("anything")).rejects.toThrow("argon2 error");
    });
  });

  describe("verify", () => {
    it("should call argon2.verify with hash then password", async () => {
      mockedArgon2.verify.mockResolvedValue(true);

      const result = await service.verify("hash", "password");

      expect(result).toBe(true);
      expect(mockedArgon2.verify).toHaveBeenCalledWith("hash", "password");
    });

    it("should return false when argon2.verify returns false", async () => {
      mockedArgon2.verify.mockResolvedValue(false);

      await expect(service.verify("hash", "wrong")).resolves.toBe(false);
    });

    it("should propagate argon2 errors", async () => {
      const error = new Error("verify error");
      mockedArgon2.verify.mockRejectedValue(error);

      await expect(service.verify("hash", "pass")).rejects.toThrow("verify error");
    });
  });
});
