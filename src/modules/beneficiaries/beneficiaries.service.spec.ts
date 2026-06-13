import { NotFoundException } from "@nestjs/common";
import { BeneficiariesService } from "./beneficiaries.service";
import {
  mockPrisma,
  createTestingModule,
  makeBeneficiary,
} from "../../common/testing";

describe("BeneficiariesService", () => {
  let service: BeneficiariesService;

  beforeEach(async () => {
    const module = await createTestingModule([BeneficiariesService]);
    service = module.get<BeneficiariesService>(BeneficiariesService);
    jest.resetAllMocks();
  });

  describe("create", () => {
    it("should create a beneficiary", async () => {
      const beneficiary = makeBeneficiary();
      mockPrisma.beneficiary.create.mockResolvedValue(beneficiary);

      const result = await service.create("user-1", {
        alias: "Test",
        beneficiaryType: "CBU",
        accountNumber: "123",
        currency: "ARS",
        country: "AR",
        isActive: true,
      });

      expect(result).toEqual(beneficiary);
      expect(mockPrisma.beneficiary.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: "user-1", alias: "Test" }),
      });
    });

    it("should default country to AR", async () => {
      mockPrisma.beneficiary.create.mockResolvedValue(makeBeneficiary());

      await service.create("user-1", {
        alias: "Test",
        beneficiaryType: "CBU",
        accountNumber: "123",
        currency: "ARS",
      });

      expect(mockPrisma.beneficiary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ country: "AR" }),
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should return active beneficiaries for user", async () => {
      const beneficiaries = [makeBeneficiary(), makeBeneficiary()];
      mockPrisma.beneficiary.findMany.mockResolvedValue(beneficiaries);

      const result = await service.findAll("user-1");

      expect(result).toEqual(beneficiaries);
      expect(mockPrisma.beneficiary.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", isActive: true },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array if no beneficiaries", async () => {
      mockPrisma.beneficiary.findMany.mockResolvedValue([]);

      const result = await service.findAll("user-1");

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return a beneficiary", async () => {
      const beneficiary = makeBeneficiary();
      mockPrisma.beneficiary.findFirst.mockResolvedValue(beneficiary);

      const result = await service.findOne("user-1", beneficiary.id);

      expect(result).toEqual(beneficiary);
    });

    it("should throw NotFoundException if not found", async () => {
      mockPrisma.beneficiary.findFirst.mockResolvedValue(null);

      await expect(service.findOne("user-1", "invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update a beneficiary", async () => {
      const beneficiary = makeBeneficiary();
      mockPrisma.beneficiary.findFirst.mockResolvedValue(beneficiary);
      mockPrisma.beneficiary.update.mockResolvedValue({
        ...beneficiary,
        alias: "Updated",
      });

      const result = await service.update("user-1", beneficiary.id, {
        alias: "Updated",
      });

      expect(result.alias).toBe("Updated");
    });

    it("should throw if beneficiary not found", async () => {
      mockPrisma.beneficiary.findFirst.mockResolvedValue(null);

      await expect(
        service.update("user-1", "invalid", { alias: "X" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should soft-delete a beneficiary", async () => {
      const beneficiary = makeBeneficiary();
      mockPrisma.beneficiary.findFirst.mockResolvedValue(beneficiary);
      mockPrisma.beneficiary.update.mockResolvedValue({
        ...beneficiary,
        isActive: false,
      });

      await service.remove("user-1", beneficiary.id);

      expect(mockPrisma.beneficiary.update).toHaveBeenCalledWith({
        where: { id: beneficiary.id },
        data: { isActive: false },
      });
    });

    it("should throw if beneficiary not found", async () => {
      mockPrisma.beneficiary.findFirst.mockResolvedValue(null);

      await expect(service.remove("user-1", "invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
