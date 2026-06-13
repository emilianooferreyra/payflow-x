import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { TokensService } from "../tokens/tokens.service";
import { EmailsService } from "../emails/emails.service";
import { AuthorizationTokenEnum } from "../../common/enums/authorization-token.enum";

@Injectable()
export class PasswordRecoveryService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
    private readonly emailsService: EmailsService,
  ) {}

  async forgotPassword(email: string) {
    const user = await this.usersService.findOne({ email }).catch(() => null);

    if (user) {
      const code = await this.tokensService.generateToken({
        userId: user.id,
        type: AuthorizationTokenEnum.RECOVERY_PASSWORD,
        ttl: 600000,
      });

      await this.emailsService.sendEmail({
        to: email,
        subject: "PayFlow — Recuperación de contraseña",
        html: `<p>Tu código de recuperación es: <strong>${code}</strong></p><p>Expira en 10 minutos.</p>`,
      });
    }

    return { message: "If the email exists, you will receive a recovery code" };
  }

  async verifyOtp(email: string, code: string) {
    const user = await this.usersService.findOne({ email });

    await this.tokensService.validateToken({
      userId: user.id,
      type: AuthorizationTokenEnum.RECOVERY_PASSWORD,
      token: code,
    });

    return { valid: true };
  }

  async resetPassword(email: string, code: string, password: string) {
    const user = await this.usersService.findOne({ email });

    await this.tokensService.validateToken({
      userId: user.id,
      type: AuthorizationTokenEnum.RECOVERY_PASSWORD,
      token: code,
    });

    await this.usersService.update({ id: user.id, password });
    await this.tokensService.revokeToken({
      userId: user.id,
      type: AuthorizationTokenEnum.RECOVERY_PASSWORD,
    });

    return { message: "Password updated successfully" };
  }
}
