// Dependencies and build staging stay outside the repository.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(web, "..");
const lock = readFileSync(join(web, "package-lock.json"));
const id = createHash("sha256")
  .update(root)
  .update(lock)
  .digest("hex")
  .slice(0, 16);
const stage = join(tmpdir(), `poolside-${id}`);
mkdirSync(stage, { recursive: true });
const action = process.argv[2];
if (
  ![
    "install",
    "install-browser",
    "build",
    "typecheck",
    "browsercheck",
  ].includes(action)
)
  throw new Error(
    "Use install, install-browser, build, typecheck, or browsercheck.",
  );
for (const name of ["package.json", "package-lock.json"])
  cpSync(join(web, name), join(stage, name));
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: stage,
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: join(tmpdir(), "poolside-browsers"),
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (action === "install") {
  run("npm", [
    "ci",
    "--cache",
    join(tmpdir(), "poolside-npm-cache"),
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    ...(process.argv.includes("--offline") ? ["--offline"] : []),
  ]);
  console.log(`Dependencies installed outside the repository: ${stage}`);
} else {
  if (!existsSync(join(stage, "node_modules")))
    throw new Error("Run npm run setup from web/ first.");
  for (const name of ["src", "public", "tests"]) {
    rmSync(join(stage, name), { recursive: true, force: true });
    cpSync(join(web, name), join(stage, name), { recursive: true });
  }
  for (const name of ["index.html", "vite.config.ts", "tsconfig.json"])
    cpSync(join(web, name), join(stage, name));
  if (action === "install-browser")
    run(process.execPath, [
      "node_modules/playwright/cli.js",
      "install",
      "chromium",
    ]);
  if (action === "browsercheck")
    run(process.execPath, ["tests/browser.mjs", root]);
  if (action === "typecheck")
    run(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"]);
  if (action === "build") {
    run(process.execPath, ["node_modules/vite/bin/vite.js", "build"]);
    rmSync(join(root, "dist"), { recursive: true, force: true });
    cpSync(join(stage, "dist"), join(root, "dist"), { recursive: true });
    console.log("Production export copied to dist/.");
  }
}
