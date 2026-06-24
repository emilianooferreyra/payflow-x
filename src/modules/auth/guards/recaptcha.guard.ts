import {
  Injectable,
  CanActivate,
  ExecutionContext,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import type { Request } from "express";

@Injectable()
export class RecaptchaGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(RecaptchaGuard.name);
  private readonly recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  private readonly threshold = parseFloat(
    process.env.RECAPTCHA_THRESHOLD ?? "0.5",
  );
  private readonly isProduction = process.env.NODE_ENV === "production";

  onModuleInit() {
    if (!this.recaptchaSecret && this.isProduction) {
      this.logger.error("CRITICAL: ReCAPTCHA secret key is missing in production environment!");
      throw new InternalServerErrorException(
        "ReCAPTCHA is misconfigured in production",
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = (request.headers["x-forwarded-for"] as string) ?? request.ip ?? request.socket?.remoteAddress;

    if (this.isLocalIp(ip)) {
      this.logger.warn(`ReCAPTCHA bypassed: local IP detected (${ip})`);
      return true;
    }

    if (!this.recaptchaSecret) {
      this.logger.warn("ReCAPTCHA bypassed: RECAPTCHA_SECRET_KEY not configured");
      return true;
    }

    const token = request.body?.recaptchaToken;
    if (!token) {
      this.logger.warn("ReCAPTCHA validation failed: missing token");
      throw new BadRequestException("ReCAPTCHA token is required");
    }

    try {
      const response = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: this.recaptchaSecret,
            response: token,
            remoteip: ip ?? "",
          }),
        },
      );

      const data = (await response.json()) as {
        success: boolean;
        score?: number;
        "error-codes"?: string[];
      };

      if (!data.success || (data.score ?? 0) < this.threshold) {
        this.logger.warn(
          `ReCAPTCHA validation failed: score=${data.score ?? 0}, threshold=${this.threshold}, errors=${JSON.stringify(data["error-codes"] ?? [])}`,
        );
        throw new ForbiddenException("Bot protection triggered. Request rejected.");
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(
        `ReCAPTCHA API call failed: ${(error as Error).message}`,
      );

      return false; 
    }
  }

  private isLocalIp(ip?: string): boolean {
    if (!ip) return false;
    
    const cleanIp = ip.replace("::ffff:", "");
    if (["127.0.0.1", "::1", "localhost"].includes(cleanIp)) return true;

    // IPv4 Privadas: 10.0.0.0/8, 192.168.0.0/16
    if (cleanIp.startsWith("10.") || cleanIp.startsWith("192.168.")) return true;

    // IPv4 Privadas: 172.16.0.0/12
    if (cleanIp.startsWith("172.")) {
      const parts = cleanIp.split(".");
      const secondOctet = parseInt(parts[1], 10);
      return secondOctet >= 16 && secondOctet <= 31;
    }

    return false;
  }
}