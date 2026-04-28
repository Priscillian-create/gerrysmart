const { spawnSync } = require("child_process");

const result = spawnSync(process.execPath, ["scripts/run-prisma.cjs", "generate"], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env
});

if (result.status === 0) {
  process.exit(0);
}

// Prisma generate is useful, but a transient package-manager issue should not
// block dependency installation when the app can still build and run.
console.warn("\n[postinstall] Prisma generate failed; continuing install.");
console.warn("[postinstall] Run `npm run prisma:generate` after reinstalling dependencies if needed.");
process.exit(0);
