import { IsString, IsUrl } from "class-validator";

export class CreateEndpointDto {
  @IsString()
  @IsUrl({ require_tld: false })
  url!: string;
}
