import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-apple";
import { readFileSync } from "fs";
import { envs } from "../../../config";
import type { Request } from "express";

export interface AppleUser {
  appleId: string;
  email: string;
  name?: string;
  lastName?: string;
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, "apple") {
  private readonly logger = new Logger(AppleStrategy.name);

  constructor() {
    const clientID = envs.APPLE_CLIENT_ID;
    const teamID = envs.APPLE_TEAM_ID;
    const keyID = envs.APPLE_KEY_ID;
    const callbackURL = envs.APPLE_CALLBACK_URL;

    const isConfigured = !!(clientID && teamID && keyID && callbackURL);

    const options: Record<string, unknown> = {
      clientID: isConfigured ? clientID : "unconfigured",
      teamID: isConfigured ? teamID : "unconfigured",
      keyID: isConfigured ? keyID : "unconfigured",
      callbackURL: isConfigured ? callbackURL : "http://localhost/unconfigured",
      passReqToCallback: true,
    };

    if (isConfigured) {
      try {
        const keyPath = process.env.APPLE_PRIVATE_KEY_PATH;
        if (keyPath) {
          options.privateKeyString = readFileSync(keyPath, "utf-8");
        }
      } catch (error) {
        new Logger("AppleStrategy").warn(
          `Failed to read Apple private key: ${(error as Error).message}`,
        );
      }
    }

    super(options);
  }

  async validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    idToken: string,
    _profile: unknown,
  ): Promise<AppleUser> {
    const payload = this.decodeIdToken(idToken);

    const appleId = payload.sub as string;
    const email = (payload.email as string) ?? `${appleId}@apple.privaterelay.appleid.com`;

    let name: string | undefined;
    let lastName: string | undefined;

    const appleProfile = (req as unknown as { appleProfile?: { name?: { firstName: string; lastName: string } } }).appleProfile;
    if (appleProfile?.name) {
      name = appleProfile.name.firstName;
      lastName = appleProfile.name.lastName;
    }

    return { appleId, email, name, lastName } satisfies AppleUser;
  }

  private decodeIdToken(idToken: string): Record<string, unknown> {
    try {
      const payload = idToken.split(".")[1];
      const decoded = Buffer.from(payload, "base64url").toString("utf-8");
      return JSON.parse(decoded);
    } catch {
      this.logger.warn("Failed to decode Apple ID token");
      return {};
    }
  }
}
