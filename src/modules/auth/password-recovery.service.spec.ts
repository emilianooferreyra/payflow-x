import { Test } from "@nestjs/testing";
import { PasswordRecoveryService } from "./password-recovery.service";
import { UsersService } from "../users/users.service";
import { TokensService } from "../tokens/tokens.service";
import { EmailsService } from "../emails/emails.service";
import { AuthorizationTokenEnum } from "../../common/enums/authorization-token.enum";

describe("PasswordRecoveryService", () => {
  let service: PasswordRecoveryService;

  const mockUserService = {
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    updateTwoFactor: jest.fn(),
  };
  const mockTokensService = {
    generateToken: jest.fn(),
    validateToken: jest.fn(),
    revokeToken: jest.fn(),
  };
  const mockEmailsService = { sendEmail: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PasswordRecoveryService,
        { provide: UsersService, useValue: mockUserService },
        { provide: TokensService, useValue: mockTokensService },
        { provide: EmailsService, useValue: mockEmailsService },
      ],
    }).compile();

    service = module.get<PasswordRecoveryService>(PasswordRecoveryService);
    jest.resetAllMocks();
  });

  describe("forgotPassword", () => {
    it("should generate token and send email when user exists", async () => {
      mockUserService.findOne.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });
      mockTokensService.generateToken.mockResolvedValue("ABC123");

      const result = await service.forgotPassword("test@example.com");

      expect(result.message).toBe(
        "If the email exists, you will receive a recovery code",
      );
      expect(mockEmailsService.sendEmail).toHaveBeenCalledWith({
        to: "test@example.com",
        subject: expect.any(String),
        html: expect.stringContaining("ABC123"),
      });
    });

    it("should not send email when user does not exist", async () => {
      mockUserService.findOne.mockRejectedValue(new Error("Not found"));

      const result = await service.forgotPassword("missing@test.com");

      expect(result.message).toBe(
        "If the email exists, you will receive a recovery code",
      );
      expect(mockEmailsService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("verifyOtp", () => {
    it("should validate the token", async () => {
      mockUserService.findOne.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });
      mockTokensService.validateToken.mockResolvedValue(undefined);

      const result = await service.verifyOtp("test@example.com", "ABC123");

      expect(result.valid).toBe(true);
      expect(mockTokensService.validateToken).toHaveBeenCalledWith({
        userId: "user-1",
        type:     AuthorizationTokenEnum.RECOVERY_PASSWORD,
        token: "ABC123",
      });
    });
  });

  describe("resetPassword", () => {
    it("should validate token, update password, and revoke token", async () => {
      mockUserService.findOne.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });
      mockTokensService.validateToken.mockResolvedValue(undefined);
      mockTokensService.revokeToken.mockResolvedValue(undefined);
      mockUserService.update.mockResolvedValue({ id: "user-1" });

      const result = await service.resetPassword(
        "test@example.com",
        "ABC123",
        "NewPass123!",
      );

      expect(result.message).toBe("Password updated successfully");
      expect(mockUserService.update).toHaveBeenCalledWith({
        id: "user-1",
        password: "NewPass123!",
      });
      expect(mockTokensService.revokeToken).toHaveBeenCalledWith({
        userId: "user-1",
        type:     AuthorizationTokenEnum.RECOVERY_PASSWORD,
      });
    });
  });
});
