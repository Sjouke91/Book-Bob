export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  return { url, publishableKey };
}

function normalizeAppUrl(value?: string | null) {
  const appUrl = value?.trim().replace(/\/+$/, "");

  if (!appUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(appUrl)) {
    return appUrl;
  }

  return `${isLocalHostname(appUrl) ? "http" : "https"}://${appUrl}`;
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function hostnameFromValue(value: string) {
  const hostname = value.trim().toLowerCase();

  if (hostname.startsWith("[") && hostname.includes("]")) {
    return hostname.slice(1, hostname.indexOf("]"));
  }

  if (hostname === "::1") {
    return hostname;
  }

  return hostname.split(":")[0];
}

function isLocalHostname(value: string) {
  const hostname = hostnameFromValue(value);

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

function isLocalAppUrl(appUrl: string) {
  try {
    return isLocalHostname(new URL(appUrl).hostname);
  } catch {
    return appUrl.includes("localhost") || appUrl.includes("127.0.0.1");
  }
}

function getRequestAppUrl(headersList?: Headers) {
  const host =
    firstHeaderValue(headersList?.get("x-forwarded-host") ?? null) ??
    firstHeaderValue(headersList?.get("host") ?? null);

  if (!host) {
    return null;
  }

  const proto =
    firstHeaderValue(headersList?.get("x-forwarded-proto") ?? null) ??
    (isLocalHostname(host) ? "http" : "https");

  return normalizeAppUrl(`${proto}://${host}`);
}

export function getAppUrl(headersList?: Headers) {
  const configuredAppUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  const requestAppUrl = getRequestAppUrl(headersList);
  const configuredIsLocal =
    configuredAppUrl !== null && isLocalAppUrl(configuredAppUrl);
  const requestIsDeployed =
    requestAppUrl !== null && !isLocalAppUrl(requestAppUrl);

  if (configuredAppUrl && !(configuredIsLocal && requestIsDeployed)) {
    return configuredAppUrl;
  }

  const vercelAppUrl =
    normalizeAppUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeAppUrl(process.env.VERCEL_URL);

  if (vercelAppUrl) {
    return vercelAppUrl;
  }

  if (requestAppUrl) {
    return requestAppUrl;
  }

  if (configuredAppUrl) {
    return configuredAppUrl;
  }

  return "http://localhost:3000";
}
