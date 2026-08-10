import packageInfo from "../../package.json";

const buildNumber = import.meta.env.VITE_BUILD_NUMBER?.trim();
const buildSha = import.meta.env.VITE_BUILD_SHA?.trim().slice(0, 7);
const releaseChannel = import.meta.env.VITE_RELEASE_CHANNEL?.trim();

export const APP_BASE_VERSION = packageInfo.version;
export const APP_VERSION = buildNumber ? `${APP_BASE_VERSION}.${buildNumber}` : `${APP_BASE_VERSION}.dev`;
export const APP_VERSION_DETAIL = buildSha
  ? `${releaseChannel === "dev" ? "dev" : "prod"} · build ${buildNumber} · ${buildSha}`
  : "version locale";
