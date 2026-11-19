#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { run } from "./cli";

const code = await run(process.argv.slice(2), {
  stdout: (t) => void process.stdout.write(t),
  stderr: (t) => void process.stderr.write(t),
  writeFile: (path, data) => writeFileSync(path, data, "utf8"),
  env: process.env,
  now: () => new Date(),
  fetch,
});
process.exitCode = code;
