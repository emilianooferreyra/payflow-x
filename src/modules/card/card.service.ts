import {
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertFound } from "../../common/utils/assert-found";

@Injectable()
export class CardService {
  constructor(private readonly prisma: PrismaService) {}

  async getCards(userId: string) {
    return this.prisma.card.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async freeze(id: string, userId: string) {
    const card = await this.prisma.card.findFirst({ where: { id, userId } });

    assertFound(card, "Card");
    if (card.isFrozen)
      throw new UnprocessableEntityException("Card is already frozen");

    return this.prisma.card.update({
      where: { id },
      data: { isFrozen: true },
    });
  }

  async unfreeze(id: string, userId: string) {
    const card = await this.prisma.card.findFirst({ where: { id, userId } });

    assertFound(card, "Card");
    if (!card.isFrozen)
      throw new UnprocessableEntityException("Card is not frozen");

    return this.prisma.card.update({
      where: { id },
      data: { isFrozen: false },
    });
  }
}
