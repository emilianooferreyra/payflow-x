import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-google-oauth20";
import { envs } from "../../../config";

interface GoogleProfile {
  id: string;
  name: { givenName: string; familyName: string };
  emails: Array<{ value: string }>;
  photos: Array<{ value: string }>;
}

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  lastName: string;
  avatar?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: envs.GOOGLE_CLIENT_ID,
      clientSecret: envs.GOOGLE_CLIENT_SECRET,
      callbackURL: envs.GOOGLE_CALLBACK_URL,
      scope: ["email", "profile"],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: GoogleProfile) {
    return {
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.name.givenName,
      lastName: profile.name.familyName,
      avatar: profile.photos[0]?.value,
    } satisfies GoogleUser;
  }
}
