import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateUserInterface,
  GetUserInterface,
  UpdateUserInterface,
} from "./interfaces/users.interface";
import { PrismaService } from "../prisma/prisma.service";
import { HashService } from "../hash/hash.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hash: HashService,
  ) {}

  private async validateEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { email: true },
    });

    if (!user) return;

    throw new BadRequestException("Email already exists");
  }

  private get safeSelect() {
    return {
      id: true,
      name: true,
      lastName: true,
      avatar: true,
      email: true,
      backupEmail: true,
      phone: true,
      country: true,
      language: true,
      emailConfirm: true,
      backupEmailConfirm: true,
      phoneConfirm: true,
      twoFactorEnabled: true,
      status: true,
      authProvider: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  async create({
    name,
    lastName,
    avatar,
    email,
    backupEmail,
    phone,
    password,
    country,
    language,
    emailConfirm,
    backupEmailConfirm,
    phoneConfirm,
    twoFactorEnabled,
    twoFactorSecret,
    status,
    authProvider,
  }: CreateUserInterface) {
    await this.validateEmail(email);
    const hashedPassword = await this.hash.hash(password);

    return await this.prisma.user.create({
      data: {
        name,
        lastName,
        avatar,
        email,
        backupEmail,
        phone,
        password: hashedPassword,
        country,
        language,
        emailConfirm,
        backupEmailConfirm,
        phoneConfirm,
        twoFactorEnabled,
        twoFactorSecret,
        status,
        authProvider,
      },
      select: this.safeSelect,
    });
  }

  async update({ id, password, email, ...data }: UpdateUserInterface) {
    await this.findOne({ id });
    if (email) await this.validateEmail(email);

    return await this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        email: email && email,
        password: password && (await this.hash.hash(password)),
      },
      select: this.safeSelect,
    });
  }

  async findOne({ id, email }: GetUserInterface) {
    const user = await this.prisma.user.findFirst({
      where: { id, email },
    });

    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateTwoFactor(id: string, data: { twoFactorEnabled?: boolean; twoFactorSecret?: string | null }) {
    await this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.findOne({ id });
    await this.prisma.user.delete({ where: { id } });
  }
}
