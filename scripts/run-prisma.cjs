const { spawnSync } = require("child_process");
const { loadEnv } = require("./load-env.cjs");

loadEnv();

const result = spawnSync(
  process.execPath,
  [require.resolve("prisma/build/index.js"), ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: process.env
  }
);

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
