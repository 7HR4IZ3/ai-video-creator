import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
export const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function fileHash(file: string) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}
export async function json<T = any>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8"));
}
export async function save(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const pending = `${file}.${crypto.randomUUID()}.pending`;
  await writeFile(pending, JSON.stringify(value, null, 2));
  await rename(pending, file);
}
export async function run(
  command: string,
  args: string[],
  timeout = 1_800_000,
) {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "",
      error = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`${command} timed out`));
    }, timeout);
    proc.stdout.on("data", (chunk) => {
      out += chunk;
      if (out.length > 20_000_000) {
        proc.kill("SIGKILL");
        reject(new Error("Worker output too large"));
      }
    });
    proc.stderr.on("data", (chunk) => {
      error = (error + chunk).slice(-5000);
    });
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(out)
        : reject(new Error(`${command} failed (${code}): ${error}`));
    });
  });
}
export async function probe(file: string) {
  return JSON.parse(
    await run(process.env.FFPROBE_BIN || "ffprobe", [
      "-v",
      "error",
      "-show_format",
      "-show_streams",
      "-of",
      "json",
      file,
    ]),
  );
}

export async function retryTransient<T>(
  request: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((r) => setTimeout(r, ms)),
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request();
    } catch (error: any) {
      const status = Number(error.status ?? error.code);
      if (attempt >= 2 || ![429, 500, 502, 503, 504].includes(status))
        throw error;
      console.warn(
        `[Recap] Analysis service returned ${status}; retrying the same request`,
      );
      await sleep((attempt + 1) * 5000);
    }
  }
}
