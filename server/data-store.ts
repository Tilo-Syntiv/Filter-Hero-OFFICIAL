import fs from "node:fs";
import path from "node:path";

/** Persistent JSON files stay under server/data, not dist/, unless DATA_DIR is set. */
export function dataFile(name: string): string {
  const dir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), "server", "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}
