import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

@Injectable()
export class HashService {
  async hash(data: string): Promise<string> {
    return await argon2.hash(data);
  }

  async verify(data: string, hash: string): Promise<boolean> {
    return argon2.verify(data, hash);
  }
}
