import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  CreateTokenInterface,
  PayloadTokenInterface,
  RevokeTokenInterface,
} from "./interfaces/token.interfaces";
import { AuthorizationTokenEnum } from "../../commom/enums/authorization-token.enum";

@Injectable()
export class TokensService {
  private readonly randomToken = () =>
    Math.floor(100000 + Math.random() * 900000).toString();
  private readonly getKey = ({
    type,
    userId,
  }: {
    type: AuthorizationTokenEnum;
    userId: string;
  }) => `token${type}:user:${userId}`;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async generateToken({ userId, type, ttl = 900000 }: CreateTokenInterface) {
    try {
      const token = this.randomToken();

      await this.cacheManager.set(
        this.getKey({ type, userId }),
        { userId, type, token },
        ttl,
      );

      return token;
    } catch (error) {
      throw new BadRequestException("There was an error.");
    }
  }

  async validateToken({ userId, type, token }: PayloadTokenInterface) {
    try {
      const payload = await this.cacheManager.get<PayloadTokenInterface>(
        this.getKey({ type, userId }),
      );

      if (!payload || payload.token !== token) {
        throw new UnauthorizedException("Invalid or expired token");
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new BadRequestException("There was an error.");
    }
  }

  async revokeToken({ userId, type }: RevokeTokenInterface): Promise<boolean> {
    try {
      await this.cacheManager.del(this.getKey({ type, userId }));

      return true;
    } catch (error) {
      throw new BadRequestException("There was an error.");
    }
  }
}
