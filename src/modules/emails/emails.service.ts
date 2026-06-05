import { BadRequestException, Injectable } from "@nestjs/common";
import { Resend } from "resend";
import { envs } from "../../config";
import { EmailInterface } from "./interfaces/email.interfaces";

@Injectable()
export class EmailsService {
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
      throw new BadRequestException("There was an error.");
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
      throw new BadRequestException("There was an error.");
    }
  }
}
