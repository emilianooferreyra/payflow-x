import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { CardService } from "./card.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { KycGuard } from "../kyc/guards/kyc.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("Cards")
@ApiCookieAuth()
@Controller("cards")
@UseGuards(JwtAuthGuard, KycGuard)
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get()
  async getCards(@CurrentUser() user) {
    return this.cardService.getCards(user.userId);
  }

  @Patch(":id/freeze")
  @HttpCode(HttpStatus.OK)
  async freeze(@CurrentUser() user, @Param("id") id: string) {
    return this.cardService.freeze(id, user.userId);
  }

  @Patch(":id/unfreeze")
  @HttpCode(HttpStatus.OK)
  async unfreeze(@CurrentUser() user, @Param("id") id: string) {
    return this.cardService.unfreeze(id, user.userId);
  }
}
