import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertFound } from "../../common/utils/assert-found";
import {
  CreateSessionInterface,
  GetAllSessions,
  GetSession,
} from "./interfaces/session.interfaces";

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create({
    id,
    userId,
    refreshToken,
    userAgent,
    ipAddress,
    location,
    isActive,
    expiresAt,
  }: CreateSessionInterface) {
    return this.prisma.session.create({
      data: {
        id,
        userId,
        refreshToken,
        userAgent,
        ipAddress,
        location,
        isActive,
        expiresAt,
      },
    });
  }

  async getAll({ userId }: GetAllSessions) {
    return this.prisma.session.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        userId: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }

  async findOne({ id, userId }: GetSession) {
    const session = await this.prisma.session.findUnique({
      where: { id, userId },
    });

    assertFound(session, "Session");

    return session;
  }

  async update({
    id,
    userId,
    refreshToken,
    userAgent,
    ipAddress,
    location,
    isActive,
    expiresAt,
  }: GetSession & Partial<CreateSessionInterface>) {
    await this.findOne({ id, userId });

    return await this.prisma.session.update({
      where: { id, userId },
      data: {
        refreshToken,
        userAgent,
        ipAddress,
        location,
        isActive,
        expiresAt,
      },
    });
  }

  async delete({ id, userId }: GetSession) {
    await this.findOne({ id, userId });

    return await this.prisma.session.delete({
      where: { id, userId },
    });
  }

  async deleteAll({ userId }: GetAllSessions) {
    return await this.prisma.session.deleteMany({
      where: { userId },
    });
  }
}
