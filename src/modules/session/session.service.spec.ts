import { NotFoundException } from "@nestjs/common";
import { SessionService } from "./session.service";
import { mockPrisma, createTestingModule } from "../../common/testing";
import { makeSession } from "../../common/testing";

describe("SessionService", () => {
  let service: SessionService;

  beforeEach(async () => {
    const module = await createTestingModule([SessionService]);
    service = module.get<SessionService>(SessionService);
    jest.resetAllMocks();
  });

  describe("create", () => {
    it("should create a new session", async () => {
      const session = makeSession();
      mockPrisma.session.create.mockResolvedValue(session);

      const result = await service.create({
        userId: session.userId,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt!,
      });

      expect(result).toEqual(session);
      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: session.userId,
          refreshToken: session.refreshToken,
        }),
      });
    });
  });

  describe("getAll", () => {
    it("should return all sessions for a user", async () => {
      const sessions = [makeSession(), makeSession()];
      mockPrisma.session.findMany.mockResolvedValue(sessions);

      const result = await service.getAll({ userId: "user-id" });

      expect(result).toEqual(sessions);
    });
  });

  describe("findOne", () => {
    it("should return a session if found", async () => {
      const session = makeSession();
      mockPrisma.session.findUnique.mockResolvedValue(session);

      const result = await service.findOne({
        id: session.id,
        userId: session.userId,
      });

      expect(result).toEqual(session);
    });

    it("should throw NotFoundException if session not found", async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne({ id: "invalid", userId: "invalid" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update and return the session", async () => {
      const session = makeSession();
      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.session.update.mockResolvedValue({
        ...session,
        isActive: false,
      });

      const result = await service.update({
        id: session.id,
        userId: session.userId,
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });
  });

  describe("delete", () => {
    it("should delete the session", async () => {
      const session = makeSession();
      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.session.delete.mockResolvedValue(session);

      const result = await service.delete({
        id: session.id,
        userId: session.userId,
      });

      expect(result).toEqual(session);
    });
  });

  describe("deleteAll", () => {
    it("should delete all sessions for a user", async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.deleteAll({ userId: "user-id" });

      expect(result.count).toBe(2);
    });
  });
});
