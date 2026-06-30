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
import { extractIp, isPrivateIp } from "../../../common/utils/ip.util";

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
    const ip = extractIp(request);

    if (isPrivateIp(ip)) {
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
            remoteip: ip,
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

}