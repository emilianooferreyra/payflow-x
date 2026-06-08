import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { KycGuard } from "../kyc/guards/kyc.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { GetTransactionsDto } from "./dto/get-transactions.dto";

@ApiTags("Transactions")
@ApiCookieAuth()
@Controller("transactions")
@UseGuards(JwtAuthGuard, KycGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  async findAll(@CurrentUser() user, @Query() query: GetTransactionsDto) {
    return this.transactionService.findAll({ userId: user.userId, ...query });
  }

  @Get(":id")
  async findOne(@CurrentUser() user, @Param("id") id: string) {
    return this.transactionService.findOne(id, user.userId);
  }
}
