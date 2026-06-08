import { BadRequestException, NotFoundException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { HashService } from "../hash/hash.service";
import {
  mockPrisma,
  createTestingModule,
  makeUser,
} from "../../common/testing";

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await createTestingModule([UsersService, HashService]);
    service = module.get<UsersService>(UsersService);
    jest.resetAllMocks();
  });

  describe("create", () => {
    it("should create a user with hashed password", async () => {
      const user = makeUser({ password: undefined });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(user);

      jest
        .spyOn(HashService.prototype, "hash")
        .mockResolvedValue("hashed-password");

      const result = await service.create({
        email: user.email,
        password: "plain-password",
        name: user.name ?? undefined,
        country: user.country ?? undefined,
        language: user.language ?? undefined,
      });

      expect(result.email).toBe(user.email);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it("should throw BadRequestException if email already exists", async () => {
      const existingUser = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue({
        email: existingUser.email,
      });

      await expect(
        service.create({
          email: existingUser.email,
          password: "password",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findOne", () => {
    it("should return a user if found by id", async () => {
      const user = makeUser();
      mockPrisma.user.findFirst.mockResolvedValue(user);

      const result = await service.findOne({ id: user.id });

      expect(result).toEqual(user);
    });

    it("should throw NotFoundException if user not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne({ id: "invalid" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update user data", async () => {
      const user = makeUser();
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({ ...user, name: "Updated" });

      const result = await service.update({ id: user.id, name: "Updated" });

      expect(result.name).toBe("Updated");
    });
  });

  describe("delete", () => {
    it("should delete the user", async () => {
      const user = makeUser();
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.delete.mockResolvedValue(user);

      await service.delete(user.id);

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: user.id },
      });
    });
  });
});
