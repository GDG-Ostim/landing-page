import { fileURLToPath } from "node:url";
import { isAbsolute, resolve } from "node:path";

export type Config = {
  production: boolean;
  port: number;
  origin: string;
  dataDir: string;
  trustProxy: boolean;
};

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  if (env.NODE_ENV && !["production", "development", "test"].includes(env.NODE_ENV)) {
    throw new Error("NODE_ENV must be production, development or test.");
  }
  const production = env.NODE_ENV === "production";
  const origin = env.APP_ORIGIN ?? "http://127.0.0.1:5173";
  const url = new URL(origin);
  if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("APP_ORIGIN must be an HTTP(S) origin without a trailing slash or path.");
  }
  if (production && (url.protocol !== "https:" || !env.APP_ORIGIN)) {
    throw new Error("Production requires an explicit HTTPS APP_ORIGIN.");
  }
  if (production && (!env.DATA_DIR || !isAbsolute(env.DATA_DIR))) {
    throw new Error("Production requires an absolute, persistent DATA_DIR outside the release directory.");
  }
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT.");
  if (env.TRUST_PROXY && !["true", "false"].includes(env.TRUST_PROXY)) {
    throw new Error("TRUST_PROXY must be true or false.");
  }
  if (env.DATA_DIR && !isAbsolute(env.DATA_DIR)) throw new Error("DATA_DIR must be absolute.");
  return {
    production, port, origin,
    dataDir: env.DATA_DIR ?? resolve(fileURLToPath(new URL("../..", import.meta.url)), ".data"),
    trustProxy: env.TRUST_PROXY === "true",
  };
}
