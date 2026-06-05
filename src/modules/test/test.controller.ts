import { Body, Controller, Post } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import type { CreateUserInterface } from "../users/interfaces/users.interface";

@Controller("test")
export class TestController {
  constructor(private readonly userService: UsersService) {}

  @Post()
  async test(@Body() data: CreateUserInterface) {
    return await this.userService.create(data);
  }
}
