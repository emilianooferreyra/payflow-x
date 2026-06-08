import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from "@nestjs/common";
import { SessionService } from "./session.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("Sessions")
@ApiCookieAuth()
@Controller("sessions")
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  async getAll(@CurrentUser() user) {
    return this.sessionService.getAll({ userId: user.userId });
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOne(@CurrentUser() user, @Param("id") id: string) {
    return this.sessionService.delete({ id, userId: user.userId });
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(@CurrentUser() user) {
    return this.sessionService.deleteAll({ userId: user.userId });
  }
}
