import { BadRequestException } from "@nestjs/common";
import { KycService } from "./kyc.service";
import { mockPrisma, createTestingModule } from "../../common/testing";

describe("KycService", () => {
  let service: KycService;

  function mockKyc(
    overrides: Partial<{
      id: string;
      userId: string;
      status: string;
      documentType: string | null;
      submittedAt: Date | null;
      reviewedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ) {
    return {
      id: overrides.id ?? "kyc-1",
      userId: overrides.userId ?? "user-1",
      status: overrides.status ?? "PENDING",
      documentType: overrides.documentType ?? null,
      submittedAt: overrides.submittedAt ?? null,
      reviewedAt: overrides.reviewedAt ?? null,
      createdAt: new Date("2026-06-14"),
      updatedAt: new Date("2026-06-14"),
    };
  }

  beforeEach(async () => {
    const module = await createTestingModule([KycService]);
    service = module.get<KycService>(KycService);
    jest.clearAllMocks();
  });

  describe("getStatus", () => {
    it("returns existing KYC record when found", async () => {
      const existing = mockKyc({ userId: "user-1", status: "APPROVED" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(existing);

      const result = await service.getStatus("user-1");

      expect(result).toEqual(existing);
      expect(mockPrisma.kycVerification.create).not.toHaveBeenCalled();
    });

    it("creates and returns a PENDING KYC when no record exists", async () => {
      mockPrisma.kycVerification.findUnique.mockResolvedValue(null);
      const created = mockKyc({ userId: "user-1", status: "PENDING" });
      mockPrisma.kycVerification.create.mockResolvedValue(created);

      const result = await service.getStatus("user-1");

      expect(result).toEqual(created);
      expect(mockPrisma.kycVerification.create).toHaveBeenCalledWith({
        data: { userId: "user-1", status: "PENDING" },
      });
    });
  });

  describe("submit", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("transitions from PENDING to IN_REVIEW with document type", async () => {
      const pending = mockKyc({ userId: "user-1", status: "PENDING" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(pending);
      const inReview = mockKyc({
        userId: "user-1",
        status: "IN_REVIEW",
        documentType: "DNI",
        submittedAt: new Date(),
      });
      mockPrisma.kycVerification.update.mockResolvedValue(inReview);

      const result = await service.submit("user-1", "DNI");

      expect(result.status).toBe("IN_REVIEW");
      expect(result.documentType).toBe("DNI");
      expect(mockPrisma.kycVerification.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: {
          status: "IN_REVIEW",
          documentType: "DNI",
          submittedAt: expect.any(Date),
          reviewedAt: null,
        },
      });
    });

    it("transitions from REJECTED to IN_REVIEW", async () => {
      const rejected = mockKyc({ userId: "user-1", status: "REJECTED" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(rejected);
      mockPrisma.kycVerification.update.mockResolvedValue(
        mockKyc({ userId: "user-1", status: "IN_REVIEW" }),
      );

      const result = await service.submit("user-1", "PASSPORT");

      expect(result.status).toBe("IN_REVIEW");
    });

    it("throws BadRequestException when KYC is IN_REVIEW", async () => {
      const inReview = mockKyc({ userId: "user-1", status: "IN_REVIEW" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(inReview);

      await expect(service.submit("user-1", "DNI")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws BadRequestException when KYC is APPROVED", async () => {
      const approved = mockKyc({ userId: "user-1", status: "APPROVED" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(approved);

      await expect(service.submit("user-1", "DNI")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("schedules auto-approve after 30 seconds", async () => {
      const setTimeoutSpy = jest.spyOn(global, "setTimeout");
      const pending = mockKyc({ userId: "user-1", status: "PENDING" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(pending);
      mockPrisma.kycVerification.update.mockResolvedValue(
        mockKyc({ userId: "user-1", status: "IN_REVIEW" }),
      );

      await service.submit("user-1", "DNI");

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
    });
  });

  describe("review", () => {
    it("approves KYC in IN_REVIEW status", async () => {
      const inReview = mockKyc({ userId: "user-1", status: "IN_REVIEW" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(inReview);
      mockPrisma.kycVerification.update.mockResolvedValue(
        mockKyc({ userId: "user-1", status: "APPROVED" }),
      );

      const result = await service.review("user-1", "approve");

      expect(result.status).toBe("APPROVED");
      expect(mockPrisma.kycVerification.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { status: "APPROVED", reviewedAt: expect.any(Date) },
      });
    });

    it("rejects KYC in IN_REVIEW status", async () => {
      const inReview = mockKyc({ userId: "user-1", status: "IN_REVIEW" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(inReview);
      mockPrisma.kycVerification.update.mockResolvedValue(
        mockKyc({ userId: "user-1", status: "REJECTED" }),
      );

      const result = await service.review("user-1", "reject");

      expect(result.status).toBe("REJECTED");
      expect(mockPrisma.kycVerification.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { status: "REJECTED", reviewedAt: expect.any(Date) },
      });
    });

    it("throws BadRequestException when KYC is PENDING", async () => {
      const pending = mockKyc({ userId: "user-1", status: "PENDING" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(pending);

      await expect(service.review("user-1", "approve")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws BadRequestException when KYC is APPROVED", async () => {
      const approved = mockKyc({ userId: "user-1", status: "APPROVED" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(approved);

      await expect(service.review("user-1", "approve")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("autoApprove", () => {
    it("approves KYC that is still IN_REVIEW", async () => {
      const inReview = mockKyc({ userId: "user-1", status: "IN_REVIEW" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(inReview);
      mockPrisma.kycVerification.update.mockResolvedValue(
        mockKyc({ userId: "user-1", status: "APPROVED" }),
      );

      await (service as any).autoApprove("user-1");

      expect(mockPrisma.kycVerification.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { status: "APPROVED", reviewedAt: expect.any(Date) },
      });
    });

    it("does nothing if KYC was already reviewed before timer", async () => {
      const approved = mockKyc({ userId: "user-1", status: "APPROVED" });
      mockPrisma.kycVerification.findUnique.mockResolvedValue(approved);

      await (service as any).autoApprove("user-1");

      expect(mockPrisma.kycVerification.update).not.toHaveBeenCalled();
    });

    it("does nothing if KYC record no longer exists", async () => {
      mockPrisma.kycVerification.findUnique.mockResolvedValue(null);

      await (service as any).autoApprove("user-1");

      expect(mockPrisma.kycVerification.update).not.toHaveBeenCalled();
    });
  });
});
