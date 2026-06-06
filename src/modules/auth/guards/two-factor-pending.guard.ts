import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class TwoFactorPendingGuard extends AuthGuard("two-factor-pending") {}
