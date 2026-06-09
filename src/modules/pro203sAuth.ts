import { randomBytes } from "node:crypto";

import axios from "axios";
import { NextResponse } from "next/server";

const DEFAULT_AUTH_BASE_URL = "https://user.pro203s.kr";
const DEFAULT_SCOPE = "profile email";

export const ACCESS_TOKEN_COOKIE = "pro203s_access_token";
export const REFRESH_TOKEN_COOKIE = "pro203s_refresh_token";
export const OAUTH_STATE_COOKIE = "pro203s_oauth_state";

const secureCookie = process.env.NODE_ENV === "production";

const baseCookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie,
    path: "/",
};

export function getAuthConfig(requestUrl?: string): Pro203sAuthConfig {
    const authBaseUrl = trimTrailingSlash(
        process.env.PRO203S_AUTH_BASE_URL ?? DEFAULT_AUTH_BASE_URL,
    );
    const clientId = process.env.PRO203S_CLIENT_ID ?? process.env.CLIENT_ID;
    const clientSecret =
        process.env.PRO203S_CLIENT_SECRET ?? process.env.CLIENT_SECRET;
    const redirectUri =
        process.env.PRO203S_REDIRECT_URI ??
        process.env.REDIRECT_URI ??
        process.env.redirect_uri ??
        (requestUrl
            ? new URL("/api/auth/callback", requestUrl).toString()
            : undefined);
    const scope = process.env.PRO203S_OAUTH_SCOPE ?? DEFAULT_SCOPE;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error(
            "Pro203S OAuth environment variables are missing. Set CLIENT_ID, CLIENT_SECRET, and redirect_uri.",
        );
    }

    return {
        authBaseUrl,
        authorizeUrl: `${authBaseUrl}/oauth2/authorize`,
        tokenUrl: `${authBaseUrl}/api/oauth2/token`,
        revokeUrl: `${authBaseUrl}/api/oauth2/revoke`,
        meUrl: `${authBaseUrl}/api/oauth2/me`,
        clientId,
        clientSecret,
        redirectUri,
        scope,
    };
}

export function createOAuthState(nextPath: string): Pro203sOAuthState {
    return {
        state: randomBytes(32).toString("base64url"),
        next: sanitizeReturnPath(nextPath),
    };
}

export function encodeOAuthState(value: Pro203sOAuthState): string {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeOAuthState(value: string | undefined): Pro203sOAuthState | null {
    if (!value) {
        return null;
    }

    try {
        const parsed = JSON.parse(
            Buffer.from(value, "base64url").toString("utf8"),
        ) as Partial<Pro203sOAuthState>;

        if (typeof parsed.state !== "string" || typeof parsed.next !== "string") {
            return null;
        }

        return {
            state: parsed.state,
            next: sanitizeReturnPath(parsed.next),
        };
    } catch {
        return null;
    }
}

export function sanitizeReturnPath(value: string | null | undefined): string {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
        return "/";
    }

    return value;
}

export async function requestToken(
    config: Pro203sAuthConfig,
    params: Record<string, string | undefined>,
): Promise<Pro203sTokenResult> {
    const response = await axios.post<
        Pro203sOAuthTokenResponse | Pro203sOAuthErrorResponse
    >(
        config.tokenUrl,
        createFormBody(config, params),
        {
            validateStatus: () => true,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        },
    );

    if (
        response.status < 200 ||
        response.status >= 300 ||
        !isTokenResponse(response.data)
    ) {
        return {
            ok: false,
            data: toOAuthErrorResponse(response.data),
            status: response.status,
        };
    }

    return {
        ok: true,
        data: response.data,
    };
}

export async function fetchCurrentUser(
    config: Pro203sAuthConfig,
    accessToken: string,
): Promise<Pro203sUserResult> {
    const response = await axios.get<
        Pro203sOAuthUserResponse | Pro203sOAuthErrorResponse
    >(config.meUrl, {
        validateStatus: () => true,
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (response.status >= 200 && response.status < 300 && isUserResponse(response.data)) {
        return {
            ok: true,
            status: response.status,
            data: response.data,
        };
    }

    return {
        ok: false,
        status: response.status,
        data: toOAuthErrorResponse(response.data),
    };
}

export async function revokeToken(
    config: Pro203sAuthConfig,
    token: string,
    tokenTypeHint?: "access_token" | "refresh_token",
) {
    const response = await axios.post(
        config.revokeUrl,
        createFormBody(config, {
            token,
            token_type_hint: tokenTypeHint,
        }),
        {
            validateStatus: () => true,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        },
    );

    return response.status === 204;
}

export function setOAuthStateCookie(
    response: NextResponse,
    value: Pro203sOAuthState,
) {
    response.cookies.set(OAUTH_STATE_COOKIE, encodeOAuthState(value), {
        ...baseCookieOptions,
        maxAge: 60 * 10,
    });
}

export function setTokenCookies(
    response: NextResponse,
    tokens: Pro203sOAuthTokenResponse,
) {
    const accessMaxAge = normalizeMaxAge(tokens.expires_in, 60 * 60);

    response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
        ...baseCookieOptions,
        maxAge: accessMaxAge,
    });

    if (tokens.refresh_token) {
        const refreshMaxAge = normalizeMaxAge(
            tokens.refresh_expires_in,
            60 * 60 * 24 * 30,
        );

        response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
            ...baseCookieOptions,
            maxAge: refreshMaxAge,
        });
    }
}

export function clearOAuthStateCookie(response: NextResponse) {
    response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/" });
}

export function clearAuthCookies(response: NextResponse) {
    response.cookies.delete({ name: ACCESS_TOKEN_COOKIE, path: "/" });
    response.cookies.delete({ name: REFRESH_TOKEN_COOKIE, path: "/" });
    response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/" });
}

export function authErrorRedirect(
    requestUrl: string,
    code: string,
    description?: string,
) {
    const url = new URL("/", requestUrl);
    url.searchParams.set("auth_error", code);

    if (description) {
        url.searchParams.set("auth_error_description", description);
    }

    return url;
}

function createFormBody(
    config: Pro203sAuthConfig,
    params: Record<string, string | undefined>,
) {
    const body = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            body.set(key, value);
        }
    }

    body.set("client_id", config.clientId);
    body.set("client_secret", config.clientSecret);

    return body;
}

function isTokenResponse(value: unknown): value is Pro203sOAuthTokenResponse {
    return (
        typeof value === "object" &&
        value !== null &&
        typeof (value as Pro203sOAuthTokenResponse).access_token === "string"
    );
}

function isUserResponse(value: unknown): value is Pro203sOAuthUserResponse {
    return (
        typeof value === "object" &&
        value !== null &&
        typeof (value as Pro203sOAuthUserResponse).id === "string"
    );
}

function toOAuthErrorResponse(value: unknown): Pro203sOAuthErrorResponse {
    if (typeof value !== "object" || value === null) {
        return {
            message: "Unexpected Pro203S response.",
        };
    }

    const data = value as Partial<Pro203sOAuthErrorResponse>;

    return {
        error: typeof data.error === "string" ? data.error : undefined,
        error_description:
            typeof data.error_description === "string"
                ? data.error_description
                : undefined,
        code: typeof data.code === "number" ? data.code : undefined,
        message: typeof data.message === "string" ? data.message : undefined,
    };
}

function normalizeMaxAge(value: number | undefined, fallback: number) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return fallback;
    }

    return Math.floor(value);
}

function trimTrailingSlash(value: string) {
    return value.endsWith("/") ? value.slice(0, -1) : value;
}
