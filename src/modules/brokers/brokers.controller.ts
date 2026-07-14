import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Controller, Get } from "@nestjs/common";
import { BrokersService } from "./brokers.service";
import { SkipCsrf } from "../../common/decorators/skip-csrf.decorator";

// Endpoint PÚBLICO por diseño: tarifario curado de brokers para el comparador
// de CEDEARs. Sin JwtAuthGuard y sin CSRF — solo lectura, no expone datos de
// usuarios ni muta estado (ver design D3).
@ApiTags("Brokers")
@SkipCsrf()
@Controller("brokers")
export class BrokersController {
  constructor(private readonly brokersService: BrokersService) {}

  @Get()
  @ApiOperation({
    summary:
      "Public broker tariff for CEDEARs cost comparison (fees, custody, sources)",
  })
  async getTariff() {
    return this.brokersService.getTariff();
  }
}
