import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UpdateUserDto } from "./dto/update-user.dto";

@ApiTags("Users")
@ApiCookieAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() user,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.update({ id: user.userId, ...body });
  }
}
