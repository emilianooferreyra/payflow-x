jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
    batch: {
      send: jest.fn(),
    },
  })),
}));

jest.mock("../../config", () => ({
  envs: {
    RESEND_API_KEY: "re_mocked",
    RESEND_FROM_EMAIL: "noreply@payflow.com",
  },
}));

import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EmailsService } from "./emails.service";

describe("EmailsService", () => {
  let service: EmailsService;
  let resendInstance: {
    emails: { send: jest.Mock };
    batch: { send: jest.Mock };
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [EmailsService],
    }).compile();

    service = module.get<EmailsService>(EmailsService);
    const { Resend } = jest.requireMock("resend");
    resendInstance = Resend.mock.results[0].value;
    jest.clearAllMocks();
  });

  describe("sendEmail", () => {
    it("sends an email via Resend with correct params", async () => {
      const mockResponse = { id: "email-1" };
      resendInstance.emails.send.mockResolvedValue(mockResponse);

      const result = await service.sendEmail({
        to: "user@test.com",
        subject: "Welcome",
        html: "<p>Hi</p>",
      });

      expect(result).toEqual(mockResponse);
      expect(resendInstance.emails.send).toHaveBeenCalledWith({
        from: "Payflow-x <noreply@payflow.com>",
        to: "user@test.com",
        subject: "Welcome",
        html: "<p>Hi</p>",
      });
    });

    it("throws BadRequestException when Resend fails", async () => {
      resendInstance.emails.send.mockRejectedValue(
        new Error("Rate limit exceeded"),
      );

      await expect(
        service.sendEmail({
          to: "user@test.com",
          subject: "Welcome",
          html: "<p>Hi</p>",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("sendBatchEmail", () => {
    it("sends multiple emails via Resend batch", async () => {
      const mockResponse = { id: "batch-1" };
      resendInstance.batch.send.mockResolvedValue(mockResponse);

      const result = await service.sendBatchEmail([
        { to: "a@test.com", subject: "A", html: "<p>A</p>" },
        { to: "b@test.com", subject: "B", html: "<p>B</p>" },
      ]);

      expect(result).toEqual(mockResponse);
      expect(resendInstance.batch.send).toHaveBeenCalledWith([
        {
          from: "Payflow-x <noreply@payflow.com>",
          to: "a@test.com",
          subject: "A",
          html: "<p>A</p>",
        },
        {
          from: "Payflow-x <noreply@payflow.com>",
          to: "b@test.com",
          subject: "B",
          html: "<p>B</p>",
        },
      ]);
    });

    it("throws BadRequestException when Resend batch fails", async () => {
      resendInstance.batch.send.mockRejectedValue(
        new Error("Invalid email address"),
      );

      await expect(
        service.sendBatchEmail([
          { to: "bad-email", subject: "Hi", html: "<p>Hi</p>" },
        ]),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
