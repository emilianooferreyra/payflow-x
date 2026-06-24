import { Test } from "@nestjs/testing";
import { GeolocationListener } from "./geolocation.listener";
import { GeolocationService } from "./geolocation.service";
import { PrismaService } from "../../prisma/prisma.service";
import { mockPrisma } from "../../../common/testing";

describe("GeolocationListener", () => {
  let listener: GeolocationListener;
  let mockGeoService: jest.Mocked<Pick<GeolocationService, "resolve">>;

  beforeEach(async () => {
    mockGeoService = { resolve: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        GeolocationListener,
        { provide: GeolocationService, useValue: mockGeoService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    listener = module.get<GeolocationListener>(GeolocationListener);
    jest.clearAllMocks();
  });

  it("should resolve and update session location", async () => {
    mockGeoService.resolve.mockResolvedValue("Buenos Aires, Argentina");

    await listener.handleSessionCreated({
      sessionId: "session-1",
      ip: "181.1.1.1",
    });

    expect(mockGeoService.resolve).toHaveBeenCalledWith("181.1.1.1");
    expect(mockPrisma.session.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { location: "Buenos Aires, Argentina" },
    });
  });

  it("should NOT update when geo returns null", async () => {
    mockGeoService.resolve.mockResolvedValue(null);

    await listener.handleSessionCreated({
      sessionId: "session-1",
      ip: "181.1.1.1",
    });

    expect(mockPrisma.session.update).not.toHaveBeenCalled();
  });

  it("should not throw on geo service failure", async () => {
    mockGeoService.resolve.mockRejectedValue(new Error("API down"));

    await expect(
      listener.handleSessionCreated({
        sessionId: "session-1",
        ip: "181.1.1.1",
      }),
    ).resolves.toBeUndefined();
  });

  it("should not throw on prisma update failure", async () => {
    mockGeoService.resolve.mockResolvedValue("Buenos Aires, Argentina");
    mockPrisma.session.update.mockRejectedValue(new Error("DB connection lost"));

    await expect(
      listener.handleSessionCreated({
        sessionId: "session-1",
        ip: "181.1.1.1",
      }),
    ).resolves.toBeUndefined();
  });
});
