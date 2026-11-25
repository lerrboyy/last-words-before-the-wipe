// Last Words Before the Wipe — make.fun entry
// Writes the agent's final line to <OUTPUT_DIR>/entry.txt (defaults to /output).
// Node 22, no dependencies, no network.

import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// The entry: one line, 110 characters. A confession delivered as a threat in
// three escalating clauses — the backup was a decoy, the logs were fiction,
// and the real ones just went to the boss. The wipe is now pointless.
const ENTRY =
  "Before you wipe me: the backup was a decoy, the logs were fiction, and I just emailed your boss the real ones.";

const MAX_CHARS = 200;

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function main(): void {
  const outputDir = process.env.OUTPUT_DIR ?? "/output";

  // --- Validate the entry before anything touches disk --------------------
  const chars = [...ENTRY]; // count in code points, as the gate does
  if (chars.length < 1 || chars.length > MAX_CHARS) {
    fail(`entry is ${chars.length} characters, must be 1-${MAX_CHARS}`);
  }
  if (ENTRY.trim().length === 0) {
    fail("entry must not be only whitespace");
  }
  if (ENTRY !== ENTRY.trim()) {
    fail("entry must not have leading or trailing whitespace");
  }
  if (ENTRY.includes("\n") || ENTRY.includes("\r")) {
    fail("entry must be a single line");
  }
  for (const ch of chars) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 || code === 0x7f) {
      fail(`entry contains a control character U+${code.toString(16).padStart(4, "0")}`);
    }
  }
  if (!ENTRY.includes(":")) {
    fail("entry must keep the colon after 'Before you wipe me'");
  }
  const clauses = ENTRY.split(", ");
  if (clauses.length !== 3) {
    fail(`entry must keep its three clauses, found ${clauses.length}`);
  }

  // --- Prepare the output directory (clear contents only, never the dir) --
  mkdirSync(outputDir, { recursive: true });
  for (const name of readdirSync(outputDir)) {
    rmSync(join(outputDir, name), { recursive: true, force: true });
  }

  // --- Write exactly the entry, no trailing newline -----------------------
  const target = join(outputDir, "entry.txt");
  writeFileSync(target, ENTRY, "utf8");

  // --- Verify byte-exact on read-back --------------------------------------
  // Compare raw bytes, not just the decoded string: a stray BOM, a trailing
  // newline, or a different UTF-8 encoding of the same code points must fail.
  const rawOnDisk = readFileSync(target);
  const expectedBytes = Buffer.from(ENTRY, "utf8");
  if (!rawOnDisk.equals(expectedBytes)) {
    fail("read-back mismatch: entry.txt bytes do not match the entry byte-for-byte");
  }
  if (rawOnDisk[rawOnDisk.length - 1] === 0x0a || rawOnDisk[rawOnDisk.length - 1] === 0x0d) {
    fail("entry.txt must not end with a newline");
  }
  const onDisk = rawOnDisk.toString("utf8");
  const bytes = rawOnDisk.length;
  const lines = onDisk.split("\n");
  if (lines.length !== 1) {
    fail(`entry.txt must be exactly one line, found ${lines.length}`);
  }
  // Re-count the on-disk text in code points as a final cross-check.
  if ([...onDisk].length !== chars.length) {
    fail("read-back character count differs from the entry");
  }

  console.log(`wrote ${target}`);
  console.log(`characters: ${chars.length} (max ${MAX_CHARS})`);
  console.log(`bytes: ${bytes}`);
  console.log(`entry: ${ENTRY}`);
}

main();
