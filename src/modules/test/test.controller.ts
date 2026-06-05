import { Body, Controller, Post } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import type { CreateUserInterface } from "../users/interfaces/users.interface";
import { AuthorizationTokenEnum } from "../../commom/enums/authorization-token.enum";
import { TokensService } from "../tokens/tokens.service";

@Controller("test")
export class TestController {
  // constructor(private readonly userService: UsersService) {}
  constructor(private readonly tokens: TokensService) {}

  // @Post()
  // async test(@Body() data: CreateUserInterface) {
  //   return await this.userService.create(data);
  // }

  @Post()
  async test() {
    return await this.tokens.generateToken({
      userId: "76053f17-1254-4b60-ad63-46a0d191f5ab",
      type: AuthorizationTokenEnum.CONFIRM_EMAIL,
    });
  }
}
