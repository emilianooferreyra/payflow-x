import { Test } from "@nestjs/testing";
import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { CardService } from "./card.service";
import { PrismaService } from "../prisma/prisma.service";
import { mockPrisma } from "../../common/testing";

describe("CardService", () => {
  let service: CardService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        CardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CardService>(CardService);
  });

  const mockCard = {
    id: "card-1",
    userId: "user-1",
    number: "****-****-****-1234",
    type: "DEBIT",
    isFrozen: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("getCards", () => {
    it("should return user cards ordered by createdAt desc", async () => {
      const cards = [
        { ...mockCard, id: "card-2", createdAt: new Date("2026-06-13") },
        { ...mockCard, id: "card-1", createdAt: new Date("2026-06-12") },
      ];
      mockPrisma.card.findMany.mockResolvedValue(cards);

      const result = await service.getCards("user-1");

      expect(result).toEqual(cards);
      expect(mockPrisma.card.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array when user has no cards", async () => {
      mockPrisma.card.findMany.mockResolvedValue([]);

      const result = await service.getCards("user-2");

      expect(result).toEqual([]);
    });
  });

  describe("freeze", () => {
    it("should freeze an active card", async () => {
      mockPrisma.card.findFirst.mockResolvedValue(mockCard);
      mockPrisma.card.update.mockResolvedValue({
        ...mockCard,
        isFrozen: true,
      });

      const result = await service.freeze("card-1", "user-1");

      expect(result.isFrozen).toBe(true);
      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id: "card-1" },
        data: { isFrozen: true },
      });
    });

    it("should throw NotFoundException when card does not exist", async () => {
      mockPrisma.card.findFirst.mockResolvedValue(null);

      await expect(service.freeze("invalid", "user-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw UnprocessableEntityException when card is already frozen", async () => {
      mockPrisma.card.findFirst.mockResolvedValue({
        ...mockCard,
        isFrozen: true,
      });

      await expect(service.freeze("card-1", "user-1")).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe("unfreeze", () => {
    it("should unfreeze a frozen card", async () => {
      mockPrisma.card.findFirst.mockResolvedValue({
        ...mockCard,
        isFrozen: true,
      });
      mockPrisma.card.update.mockResolvedValue({
        ...mockCard,
        isFrozen: false,
      });

      const result = await service.unfreeze("card-1", "user-1");

      expect(result.isFrozen).toBe(false);
      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id: "card-1" },
        data: { isFrozen: false },
      });
    });

    it("should throw NotFoundException when card does not exist", async () => {
      mockPrisma.card.findFirst.mockResolvedValue(null);

      await expect(service.unfreeze("invalid", "user-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw UnprocessableEntityException when card is not frozen", async () => {
      mockPrisma.card.findFirst.mockResolvedValue(mockCard);

      await expect(service.unfreeze("card-1", "user-1")).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });
});
