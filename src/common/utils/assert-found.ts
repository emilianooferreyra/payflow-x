import { NotFoundException } from "@nestjs/common";

export function assertFound<T>(
  value: T | null | undefined,
  name: string,
): asserts value is T {
  if (value == null) {
    throw new NotFoundException(`${name} not found`);
  }
}
