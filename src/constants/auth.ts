import { match } from "ts-pattern";

const PUBLIC_PATHS = ["/", "/login", "/signup"] as const;
const PUBLIC_PREFIXES = ["/_next", "/api", "/favicon", "/static", "/docs", "/images"] as const;

export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";
export const AUTH_ENTRY_PATHS = [LOGIN_PATH, SIGNUP_PATH] as const;
export const isAuthEntryPath = (
  pathname: string
): pathname is (typeof AUTH_ENTRY_PATHS)[number] =>
  AUTH_ENTRY_PATHS.includes(pathname as (typeof AUTH_ENTRY_PATHS)[number]);

export const isAuthPublicPath = (pathname: string) => {
  const normalized = pathname.toLowerCase();

  return match(normalized)
    .when(
      (path) => PUBLIC_PATHS.some((publicPath) => publicPath === path),
      () => true
    )
    .when(
      (path) => PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix)),
      () => true
    )
    .otherwise(() => false);
};

/**
 * 현재 플랫폼은 로그인 기능을 제공하지 않으므로 모든 경로를 공개로 취급합니다.
 */
export const shouldProtectPath = (_pathname: string) => false;
