import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const SUBMITTABLE_STATES = ['PENDING', 'REJECTED']

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string) {
    const existing = await this.prisma.kycVerification.findUnique({ where: { userId } })
    if (existing) return existing

    return this.prisma.kycVerification.create({
      data: { userId, status: 'PENDING' },
    })
  }

  async submit(userId: string, documentType: string) {
    const kyc = await this.getStatus(userId)

    if (!SUBMITTABLE_STATES.includes(kyc.status)) {
      throw new BadRequestException(
        `Cannot submit KYC from status ${kyc.status}`,
      )
    }

    return this.prisma.kycVerification.update({
      where: { userId },
      data: {
        status: 'IN_REVIEW',
        documentType,
        submittedAt: new Date(),
        reviewedAt: null,
      },
    })
  }

  async review(userId: string, action: 'approve' | 'reject') {
    const kyc = await this.getStatus(userId)

    if (kyc.status !== 'IN_REVIEW') {
      throw new BadRequestException(`Cannot review KYC from status ${kyc.status}`)
    }

    return this.prisma.kycVerification.update({
      where: { userId },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
      },
    })
  }
}
