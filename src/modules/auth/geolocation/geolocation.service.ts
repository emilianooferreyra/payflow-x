import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);
  private readonly cacheTtl = 3_600_000;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async resolve(ip: string): Promise<string | null> {
    if (this.isPrivateIp(ip)) {
      this.logger.debug(`Private IP detected: ${ip}`);
      return "Local network";
    }

    const cacheKey = `geo:${ip}`;

    try {
      const cached = await this.cacheManager.get<string>(cacheKey);
      if (cached) return cached;
    } catch {
      this.logger.warn("Redis cache unavailable, skipping cache lookup");
    }

    try {
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=city,country`,
        { signal: AbortSignal.timeout(3000) },
      );

      if (!response.ok) {
        this.logger.warn(`ip-api.com returned ${response.status} for ${ip}`);
        return null;
      }

      const data = (await response.json()) as {
        city: string;
        country: string;
      };

      if (!data.city && !data.country) return null;

      const location = `${data.city}, ${data.country}`;

      try {
        await this.cacheManager.set(cacheKey, location, this.cacheTtl);
      } catch {
        this.logger.warn("Failed to cache geolocation result");
      }

      return location;
    } catch (error) {
      this.logger.error(
        `Geolocation failed for ${ip}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private isPrivateIp(ip: string): boolean {
    return (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "::ffff:127.0.0.1" ||
      ip === "localhost" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
    );
  }
}
