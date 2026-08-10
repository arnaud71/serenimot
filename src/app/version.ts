import packageInfo from "../../package.json";

const buildNumber = import.meta.env.VITE_BUILD_NUMBER?.trim();
const buildSha = import.meta.env.VITE_BUILD_SHA?.trim().slice(0, 7);
const buildDate = import.meta.env.VITE_BUILD_DATE?.trim();
const releaseChannel = import.meta.env.VITE_RELEASE_CHANNEL?.trim();

export const APP_BASE_VERSION = packageInfo.version;
export const APP_VERSION = buildNumber ? `${APP_BASE_VERSION}.${buildNumber}` : `${APP_BASE_VERSION}.dev`;
export const APP_VERSION_DETAIL = buildSha
  ? `${releaseChannel === "dev" ? "dev" : "prod"} · build ${buildNumber} · ${buildSha}`
  : "version locale";
export const APP_UPDATED_AT = formatBuildDate(buildDate);

function formatBuildDate(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return value ?? "date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
