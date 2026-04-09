const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { loadEnv } = require("../scripts/load-env.cjs");

loadEnv();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD in environment.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { password: passwordHash, role: UserRole.admin }
    });
    console.log(`Updated existing admin user: ${email}`);
  } else {
    await prisma.user.create({
      data: { email, password: passwordHash, role: UserRole.admin }
    });
    console.log(`Created admin user: ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
