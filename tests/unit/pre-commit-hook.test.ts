import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRE_COMMIT_PATH = path.join(REPO_ROOT, ".husky/pre-commit");
const OWNER_NAME = "diegosouzapw";
const OWNER_EMAIL = "8016841+diegosouzapw@users.noreply.github.com";

function makePathWithoutNpx() {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "or-pre-commit-bin-"));
  for (const binary of ["git", "sed", "cat", "sh"]) {
    const candidates = [`/usr/bin/${binary}`, `/bin/${binary}`, `/usr/local/bin/${binary}`];
    const binaryPath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!binaryPath) {
      throw new Error(`${binary} binary not found`);
    }
    fs.symlinkSync(binaryPath, path.join(binDir, binary));
  }
  return binDir;
}

test("pre-commit runs identity gate before checking npx availability", () => {
  const noNpxPath = makePathWithoutNpx();
  try {
    const result = spawnSync("/bin/sh", [PRE_COMMIT_PATH], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: noNpxPath,
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_SYSTEM: "/dev/null",
        GIT_AUTHOR_NAME: "Markus Hartung",
        GIT_AUTHOR_EMAIL: OWNER_EMAIL,
        GIT_COMMITTER_NAME: "Markus Hartung",
        GIT_COMMITTER_EMAIL: OWNER_EMAIL,
        GIT_CONFIG_COUNT: "2",
        GIT_CONFIG_KEY_0: "omniroute.expectedName",
        GIT_CONFIG_VALUE_0: OWNER_NAME,
        GIT_CONFIG_KEY_1: "omniroute.expectedEmail",
        GIT_CONFIG_VALUE_1: OWNER_EMAIL,
      },
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr ?? "", /COMMITTER não é a identidade desta máquina/);
    assert.doesNotMatch(result.stderr ?? "", /npx not found/);
    assert.doesNotMatch(result.stdout ?? "", /npx not found/);
  } finally {
    fs.rmSync(noNpxPath, { recursive: true, force: true });
  }
});
