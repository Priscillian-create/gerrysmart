import bcrypt from "bcryptjs";

export function hashPassword(value: string) {
  return bcrypt.hash(value, 12);
}

export function verifyPassword(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}
