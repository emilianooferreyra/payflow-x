import { Test, TestingModule } from '@nestjs/testing';
import { HashModule } from '../src/modules/hash/hash.module';
import { HashService } from '../src/modules/hash/hash.service';

const KNOWN_PASSWORD = '1234567';
const KNOWN_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$jPayzQs6brOqQ/IV8641OQ$3JIayBQH3bmixWMVVUmhU1SP/dz9wIPKvPk3PTLSp/g';

describe('HashService (e2e)', () => {
  let hashService: HashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HashModule],
    }).compile();

    hashService = module.get<HashService>(HashService);
  });

  describe('hash', () => {
    it('should hash a password and return an argon2 hash', async () => {
      const hashed = await hashService.hash(KNOWN_PASSWORD);

      expect(hashed).not.toBe(KNOWN_PASSWORD);
      expect(hashed).toMatch(/^\$argon2/);
    });

    it('should produce different hashes for the same password (random salt)', async () => {
      const hash1 = await hashService.hash(KNOWN_PASSWORD);
      const hash2 = await hashService.hash(KNOWN_PASSWORD);

      expect(hash1).not.toBe(hash2);
    });

    it('should hash a password with special characters', async () => {
      const hashed = await hashService.hash('P@$$w0rd!#%&*');

      expect(hashed).toMatch(/^\$argon2/);
    });
  });

  describe('verify', () => {
    it('should verify a known password against its pre-computed hash', async () => {
      await expect(hashService.verify(KNOWN_HASH, KNOWN_PASSWORD)).resolves.toBe(true);
    });

    it('should verify a freshly hashed password correctly', async () => {
      const hashed = await hashService.hash(KNOWN_PASSWORD);

      await expect(hashService.verify(hashed, KNOWN_PASSWORD)).resolves.toBe(true);
    });

    it('should reject a similar but wrong password', async () => {
      await expect(hashService.verify(KNOWN_HASH, '1234568')).resolves.toBe(false);
    });

    it('should reject an empty string against a valid hash', async () => {
      await expect(hashService.verify(KNOWN_HASH, '')).resolves.toBe(false);
    });

    it('should reject the correct password against a different hash', async () => {
      const otherHash = await hashService.hash('OtherPassword99!');

      await expect(hashService.verify(otherHash, KNOWN_PASSWORD)).resolves.toBe(false);
    });
  });
});
