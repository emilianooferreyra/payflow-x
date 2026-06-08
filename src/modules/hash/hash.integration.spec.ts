import { Test, TestingModule } from "@nestjs/testing";
import { HashService } from "./hash.service";

const KNOWN_PASSWORD = "1234567";
const KNOWN_HASH = "$argon2id$v=19$m=65536,t=3,p=4$jPayzQs6brOqQ/IV8641OQ$3JIayBQH3bmixWMVVUmhU1SP/dz9wIPKvPk3PTLSp/g";

describe("HashService (integration)", () => {
  let service: HashService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashService],
    }).compile();

    service = module.get<HashService>(HashService);
  });

  describe("hash", () => {
    it("should return an argon2 hash string", async () => {
      const hashed = await service.hash(KNOWN_PASSWORD);

      expect(hashed).not.toBe(KNOWN_PASSWORD);
      expect(hashed).toMatch(/^\$argon2id\$v=\d+\$m=\d+,t=\d+,p=\d+\$.+\$.+$/);
    });

    it("should produce different hashes for the same input (random salt)", async () => {
      const [hash1, hash2] = await Promise.all([
        service.hash(KNOWN_PASSWORD),
        service.hash(KNOWN_PASSWORD),
      ]);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle special characters", async () => {
      const hashed = await service.hash("P@$$w0rd!#%&*");

      expect(hashed).toMatch(/^\$argon2id/);
    });
  });

  describe("verify", () => {
    it("should verify a known password against its pre-computed hash", async () => {
      await expect(service.verify(KNOWN_HASH, KNOWN_PASSWORD)).resolves.toBe(true);
    });

    it("should verify a freshly hashed password", async () => {
      const hashed = await service.hash(KNOWN_PASSWORD);

      await expect(service.verify(hashed, KNOWN_PASSWORD)).resolves.toBe(true);
    });

    it("should reject a wrong password", async () => {
      await expect(service.verify(KNOWN_HASH, "wrong")).resolves.toBe(false);
    });

    it("should reject an empty string", async () => {
      await expect(service.verify(KNOWN_HASH, "")).resolves.toBe(false);
    });

    it("should reject the correct password against a different hash", async () => {
      const otherHash = await service.hash("OtherPassword99!");

      await expect(service.verify(otherHash, KNOWN_PASSWORD)).resolves.toBe(false);
    });
  });
});
