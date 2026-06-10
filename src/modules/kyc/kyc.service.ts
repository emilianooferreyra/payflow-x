import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const SUBMITTABLE_STATES = ["PENDING", "REJECTED"];
const AUTO_APPROVE_DELAY_MS = 30_000;

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string) {
    const existing = await this.prisma.kycVerification.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    return this.prisma.kycVerification.create({
      data: { userId, status: "PENDING" },
    });
  }

  async submit(userId: string, documentType: string) {
    const kyc = await this.getStatus(userId);

    if (!SUBMITTABLE_STATES.includes(kyc.status)) {
      throw new BadRequestException(
        `Cannot submit KYC from status ${kyc.status}`,
      );
    }

    const result = await this.prisma.kycVerification.update({
      where: { userId },
      data: {
        status: "IN_REVIEW",
        documentType,
        submittedAt: new Date(),
        reviewedAt: null,
      },
    });

    setTimeout(() => {
      this.autoApprove(userId).catch((err) =>
        this.logger.error(`Auto-approve failed for ${userId}: ${err.message}`),
      );
    }, AUTO_APPROVE_DELAY_MS);

    return result;
  }

  private async autoApprove(userId: string) {
    const kyc = await this.prisma.kycVerification.findUnique({
      where: { userId },
    });
    if (!kyc || kyc.status !== "IN_REVIEW") return;

    await this.prisma.kycVerification.update({
      where: { userId },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
    this.logger.log(`KYC auto-approved for user ${userId}`);
  }

  async review(userId: string, action: "approve" | "reject") {
    const kyc = await this.getStatus(userId);

    if (kyc.status !== "IN_REVIEW") {
      throw new BadRequestException(
        `Cannot review KYC from status ${kyc.status}`,
      );
    }

    return this.prisma.kycVerification.update({
      where: { userId },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        reviewedAt: new Date(),
      },
    });
  }
}
