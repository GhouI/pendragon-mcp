export type ClientTarget = {
  name: string;
  url: string;
  token: string;
};

export type ParsedClientArgs = {
  urls: string[];
  command?: string;
  toolName?: string;
  argParts: string[];
};

type Env = Record<string, string | undefined>;

const DEFAULT_URL = "http://127.0.0.1:7573/mcp";

export function parseClientArgs(argv: string[]): ParsedClientArgs {
  const urls: string[] = [];
  const remaining: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--url") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--url requires a value");
      }
      urls.push(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--url=")) {
      urls.push(arg.slice("--url=".length));
      continue;
    }

    remaining.push(arg);
  }

  const [command, toolName, ...argParts] = remaining;
  return { urls, command, toolName, argParts };
}

export function resolveClientTargets(env: Env, overrideUrls: string[] = []): ClientTarget[] {
  if (overrideUrls.length > 0) {
    const token = requireToken(env, "PENDRAGON_TOKEN");
    return overrideUrls.map((url, index) => createTarget(`target-${index + 1}`, url, token));
  }

  if (env.PENDRAGON_TARGETS) {
    return parseJsonTargets(env.PENDRAGON_TARGETS, env);
  }

  const urls = splitUrls(env.PENDRAGON_URLS ?? env.PENDRAGON_URL ?? DEFAULT_URL);
  const token = requireToken(env, "PENDRAGON_TOKEN");
  return urls.map((url, index) => createTarget(urls.length === 1 ? "default" : `target-${index + 1}`, url, token));
}

function parseJsonTargets(raw: string, env: Env): ClientTarget[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("PENDRAGON_TARGETS must be a non-empty JSON array");
  }

  return parsed.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`PENDRAGON_TARGETS[${index}] must be an object`);
    }

    const url = readString(entry, "url", `PENDRAGON_TARGETS[${index}].url`);
    const name = typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : `target-${index + 1}`;
    const token =
      typeof entry.token === "string" && entry.token
        ? entry.token
        : readTokenFromEnv(entry, env, index) ?? requireToken(env, "PENDRAGON_TOKEN");

    return createTarget(name, url, token);
  });
}

function readTokenFromEnv(entry: Record<string, unknown>, env: Env, index: number): string | undefined {
  if (entry.tokenEnv === undefined) {
    return undefined;
  }

  if (typeof entry.tokenEnv !== "string" || !entry.tokenEnv.trim()) {
    throw new Error(`PENDRAGON_TARGETS[${index}].tokenEnv must be a non-empty string`);
  }

  return requireToken(env, entry.tokenEnv);
}

function createTarget(name: string, url: string, token: string): ClientTarget {
  const parsedUrl = new URL(url);
  return {
    name,
    url: parsedUrl.toString(),
    token
  };
}

function splitUrls(raw: string): string[] {
  return raw
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

function requireToken(env: Env, name: string): string {
  const token = env[name];
  if (!token) {
    throw new Error(`${name} is required`);
  }
  return token;
}

function readString(entry: Record<string, unknown>, key: string, path: string): string {
  const value = entry[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${path} must be a non-empty string`);
  }

  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
