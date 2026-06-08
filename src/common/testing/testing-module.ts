import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { mockPrisma } from "./mock-prisma";
import { Provider } from "@nestjs/common";

export const createTestingModule = async (
  providers: Provider[],
  imports: Parameters<typeof Test.createTestingModule>[0]["imports"] = [],
): Promise<TestingModule> => {
  return Test.createTestingModule({
    providers: [
      ...providers,
      {
        provide: PrismaService,
        useValue: mockPrisma,
      },
    ],
    imports,
  }).compile();
};
