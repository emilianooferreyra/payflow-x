import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { BeneficiariesService } from "./beneficiaries.service";
import { CreateBeneficiaryDto } from "./dto/create-beneficiary.dto";
import { UpdateBeneficiaryDto } from "./dto/update-beneficiary.dto";

@ApiTags("Beneficiaries")
@ApiCookieAuth()
@Controller("beneficiaries")
@UseGuards(JwtAuthGuard)
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateBeneficiaryDto,
  ) {
    return this.beneficiariesService.create(user.userId, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: { userId: string }) {
    return this.beneficiariesService.findAll(user.userId);
  }

  @Get(":id")
  async findOne(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.beneficiariesService.findOne(user.userId, id);
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() dto: UpdateBeneficiaryDto,
  ) {
    return this.beneficiariesService.update(user.userId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    await this.beneficiariesService.remove(user.userId, id);
  }
}
