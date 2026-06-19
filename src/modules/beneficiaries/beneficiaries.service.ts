import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertFound } from "../../common/utils/assert-found";
import { CreateBeneficiaryDto } from "./dto/create-beneficiary.dto";
import { UpdateBeneficiaryDto } from "./dto/update-beneficiary.dto";

@Injectable()
export class BeneficiariesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBeneficiaryDto) {
    return this.prisma.beneficiary.create({
      data: {
        ...dto,
        userId,
        country: dto.country ?? "AR",
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.beneficiary.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(userId: string, id: string) {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: { id, userId },
    });
    assertFound(beneficiary, "Beneficiary");
    return beneficiary;
  }

  async update(userId: string, id: string, dto: UpdateBeneficiaryDto) {
    await this.findOne(userId, id);
    return this.prisma.beneficiary.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.beneficiary.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
