import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { envs } from "../../config";
import { EmailInterface } from "./interfaces/email.interfaces";

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(envs.RESEND_API_KEY);
  }

  async sendEmail({ to, subject, html }: EmailInterface) {
    try {
      return await this.resend.emails.send({
        from: `Payflow-x <${envs.RESEND_FROM_EMAIL}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send email to ${to} (${subject}): ${(error as Error).message}`,
      );
      throw new BadRequestException(`Failed to send email to ${to}`);
    }
  }

  async sendBatchEmail(emails: EmailInterface[]) {
    try {
      return await this.resend.batch.send(
        emails.map(({ to, subject, html }) => ({
          from: `Payflow-x <${envs.RESEND_FROM_EMAIL}>`,
          to,
          subject,
          html,
        })),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send batch email (${emails.length} recipients): ${(error as Error).message}`,
      );
      throw new BadRequestException("Failed to send batch email");
    }
  }
}
