require("./setup-env");

jest.mock("otplib", () => ({
  generateSecret: jest.fn(() => "mocked-secret"),
  generateURI: jest.fn(() => "mocked-uri"),
  verify: jest.fn(() => ({ valid: true })),
}));

jest.mock("qrcode", () => ({ toDataURL: jest.fn(() => "mocked-qr") }));
