import { randomBytes } from "node:crypto";

import axios from "axios";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAPIErrorResponse, toAPIErrorResponse } from "./apiError";
import type {
    AuthConfig,
    DiscordUserResponse,
    OAuthErrorResponse,
    OAuthState,
    OAuthTokenResponse,
    OAuthTokenResult,
    OAuthUserResponse,
    OAuthUserResult,
} from "./discordAuthTypes";

const DEFAULT_AUTH_BASE_URL = "https://discord.com";
const DEFAULT_API_BASE_URL = "https://discord.com/api";
const DEFAULT_CDN_BASE_URL = "https://cdn.discordapp.com";
const DEFAULT_SCOPE = "identify email";

export const ACCESS_TOKEN_COOKIE = "discord_access_token";
export const REFRESH_TOKEN_COOKIE = "discord_refresh_token";
export const OAUTH_STATE_COOKIE = "discord_oauth_state";

const secureCookie = process.env.NODE_ENV === "production";

const baseCookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie,
    path: "/",
};

export class DiscordSessionError extends Error {
    status: number;
    detail: OAuthErrorResponse;

    constructor(status: number, detail: OAuthErrorResponse) {
        super(detail.message);
        this.name = "DiscordSessionError";
        this.status = status;
        this.detail = detail;
    }
}

export type DiscordSession = {
    user: OAuthUserResponse;
    tokens?: OAuthTokenResponse;
};

export function getAuthConfig(requestUrl?: string): AuthConfig {
    const authBaseUrl = trimTrailingSlash(
        process.env.DISCORD_AUTH_BASE_URL ?? DEFAULT_AUTH_BASE_URL,
    );
    const apiBaseUrl = trimTrailingSlash(
        process.env.DISCORD_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    );
    const cdnBaseUrl = trimTrailingSlash(
        process.env.DISCORD_CDN_BASE_URL ?? DEFAULT_CDN_BASE_URL,
    );
    const clientId = firstEnv("DISCORD_CLIENT_ID", "CLIENT_ID");
    const clientSecret = firstEnv("DISCORD_CLIENT_SECRET", "CLIENT_SECRET");
    const redirectUri =
        firstEnv("DISCORD_REDIRECT_URI", "REDIRECT_URI", "redirect_uri") ??
        (requestUrl
            ? new URL("/api/auth/callback", requestUrl).toString()
            : undefined);
    const scope = firstEnv("DISCORD_OAUTH_SCOPE", "OAUTH_SCOPE") ?? DEFAULT_SCOPE;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error(
            "Discord OAuth environment variables are missing. Set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and DISCORD_REDIRECT_URI.",
        );
    }

    return {
        authBaseUrl,
        apiBaseUrl,
        cdnBaseUrl,
        authorizeUrl:
            process.env.DISCORD_AUTHORIZE_URL ??
            `${authBaseUrl}/oauth2/authorize`,
        tokenUrl:
            process.env.DISCORD_TOKEN_URL ??
            `${apiBaseUrl}/oauth2/token`,
        revokeUrl:
            process.env.DISCORD_REVOKE_URL ??
            `${apiBaseUrl}/oauth2/token/revoke`,
        meUrl:
            process.env.DISCORD_ME_URL ??
            `${apiBaseUrl}/users/@me`,
        clientId,
        clientSecret,
        redirectUri,
        scope,
    };
}

export function createOAuthState(nextPath: string): OAuthState {
    return {
        state: randomBytes(32).toString("base64url"),
        next: sanitizeReturnPath(nextPath),
    };
}

export function encodeOAuthState(value: OAuthState): string {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeOAuthState(value: string | undefined): OAuthState | null {
    if (!value) {
        return null;
    }

    try {
        const parsed = JSON.parse(
            Buffer.from(value, "base64url").toString("utf8"),
        ) as Partial<OAuthState>;

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
    config: AuthConfig,
    params: Record<string, string | undefined>,
): Promise<OAuthTokenResult> {
    const response = await axios.post<
        OAuthTokenResponse | OAuthErrorResponse
    >(
        config.tokenUrl,
        createFormBody(config, params),
        {
            validateStatus: () => true,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        },
    );
    const tokenData = parseOAuthTokenResponse(response.data);

    if (
        response.status < 200 ||
        response.status >= 300 ||
        !tokenData
    ) {
        return {
            ok: false,
            data: toOAuthErrorResponse(response.data),
            status: response.status,
        };
    }

    return {
        ok: true,
        data: tokenData,
    };
}

export async function fetchCurrentUser(
    config: AuthConfig,
    accessToken: string,
): Promise<OAuthUserResult> {
    const response = await axios.get<
        DiscordUserResponse | OAuthErrorResponse
    >(config.meUrl, {
        validateStatus: () => true,
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    const userData = parseDiscordUserResponse(response.data, config);

    if (response.status >= 200 && response.status < 300 && userData) {
        return {
            ok: true,
            status: response.status,
            data: userData,
        };
    }

    return {
        ok: false,
        status: response.status,
        data: toOAuthErrorResponse(response.data),
    };
}

export async function getCurrentSessionUser(
    request: NextRequest,
): Promise<OAuthUserResponse> {
    const session = await getCurrentSession(request);

    return session.user;
}

export async function getCurrentSession(
    request: NextRequest,
): Promise<DiscordSession> {
    let config: AuthConfig;

    try {
        config = getAuthConfig(request.url);
    } catch (error) {
        throw new DiscordSessionError(
            500,
            createAPIErrorResponse(
                "server_misconfigured",
                error instanceof Error
                    ? error.message
                    : "OAuth 설정이 없습니다.",
            ),
        );
    }

    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!accessToken && !refreshToken) {
        throw new DiscordSessionError(
            401,
            createAPIErrorResponse("unauthorized", "로그인이 필요합니다."),
        );
    }

    if (accessToken) {
        const userResult = await fetchCurrentUser(config, accessToken);

        if (userResult.ok) {
            return { user: userResult.data };
        }

        if (userResult.status !== 401 || !refreshToken) {
            throw new DiscordSessionError(userResult.status, userResult.data);
        }
    }

    const refreshResult = await requestToken(config, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    });

    if (!refreshResult.ok) {
        throw new DiscordSessionError(refreshResult.status, refreshResult.data);
    }

    const refreshedUserResult = await fetchCurrentUser(
        config,
        refreshResult.data.access_token,
    );

    if (refreshedUserResult.ok) {
        return {
            user: refreshedUserResult.data,
            tokens: refreshResult.data,
        };
    }

    throw new DiscordSessionError(
        refreshedUserResult.status,
        refreshedUserResult.data,
    );
}

export function attachSessionCookies(
    response: NextResponse,
    session: DiscordSession,
) {
    if (session.tokens) {
        setTokenCookies(response, session.tokens);
    }

    return response;
}

export async function revokeToken(
    config: AuthConfig,
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

    return response.status >= 200 && response.status < 300;
}

export function setOAuthStateCookie(
    response: NextResponse,
    value: OAuthState,
) {
    response.cookies.set(OAUTH_STATE_COOKIE, encodeOAuthState(value), {
        ...baseCookieOptions,
        maxAge: 60 * 10,
    });
}

export function setTokenCookies(
    response: NextResponse,
    tokens: OAuthTokenResponse,
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
    config: AuthConfig,
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

function parseOAuthTokenResponse(value: unknown): OAuthTokenResponse | null {
    if (typeof value === "string") {
        const trimmed = value.trim();

        if (!trimmed) {
            return null;
        }

        if (trimmed.startsWith("{")) {
            try {
                return parseOAuthTokenResponse(JSON.parse(trimmed));
            } catch {
                return null;
            }
        }

        return parseOAuthTokenParams(new URLSearchParams(trimmed));
    }

    if (typeof value !== "object" || value === null) {
        return null;
    }

    const data = value as Record<string, unknown>;
    const accessToken = getString(data.access_token);

    if (!accessToken) {
        return null;
    }

    return {
        access_token: accessToken,
        token_type: getString(data.token_type),
        expires_in: getNumber(data.expires_in),
        refresh_token: getString(data.refresh_token),
        refresh_expires_in: getNumber(data.refresh_expires_in),
        scope: getString(data.scope),
    };
}

function parseOAuthTokenParams(params: URLSearchParams): OAuthTokenResponse | null {
    const accessToken = getString(params.get("access_token"));

    if (!accessToken) {
        return null;
    }

    return {
        access_token: accessToken,
        token_type: getString(params.get("token_type")),
        expires_in: getNumber(params.get("expires_in")),
        refresh_token: getString(params.get("refresh_token")),
        refresh_expires_in: getNumber(params.get("refresh_expires_in")),
        scope: getString(params.get("scope")),
    };
}

function parseDiscordUserResponse(
    value: unknown,
    config: AuthConfig,
): OAuthUserResponse | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    const data = value as Record<string, unknown>;
    const id = getString(data.id);
    const username = getString(data.username);

    if (!id || !username) {
        return null;
    }

    const displayName = getString(data.global_name) ?? username;
    const profile = createDiscordAvatarUrl({
        id,
        avatar: getString(data.avatar),
        discriminator: getString(data.discriminator),
    }, config);
    const email = getString(data.email);

    return {
        id,
        username,
        displayName,
        profile,
        ...(email ? { email } : {}),
    };
}

function createDiscordAvatarUrl(
    user: Pick<DiscordUserResponse, "id" | "avatar" | "discriminator">,
    config: AuthConfig,
) {
    if (user.avatar) {
        const extension = user.avatar.startsWith("a_") ? "gif" : "webp";

        return `${config.cdnBaseUrl}/avatars/${user.id}/${user.avatar}.${extension}?size=256`;
    }

    return `${config.cdnBaseUrl}/embed/avatars/${getDefaultAvatarIndex(user)}.png`;
}

function getDefaultAvatarIndex(
    user: Pick<DiscordUserResponse, "id" | "discriminator">,
) {
    const discriminator = getNumber(user.discriminator);

    if (discriminator !== undefined && discriminator > 0) {
        return discriminator % 5;
    }

    try {
        return Number((BigInt(user.id) >> BigInt(22)) % BigInt(6));
    } catch {
        return 0;
    }
}

function toOAuthErrorResponse(value: unknown): OAuthErrorResponse {
    if (typeof value === "string") {
        const trimmed = value.trim();

        if (trimmed.startsWith("{")) {
            try {
                return toOAuthErrorResponse(JSON.parse(trimmed));
            } catch {
                return toAPIErrorResponse(value);
            }
        }

        if (trimmed.includes("=")) {
            const params = new URLSearchParams(trimmed);
            const code = getString(params.get("code")) ??
                getString(params.get("error"));
            const message = getString(params.get("message")) ??
                getString(params.get("error_description"));

            if (code || message) {
                return createAPIErrorResponse(
                    code ?? "discord_request_failed",
                    message ?? "Discord 요청에 실패했습니다.",
                );
            }
        }
    }

    return toAPIErrorResponse(
        value,
        "discord_request_failed",
        "Discord 요청에 실패했습니다.",
    );
}

function getString(value: unknown) {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();

    return trimmed || undefined;
}

function getNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value !== "string") {
        return undefined;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
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

function firstEnv(...names: string[]) {
    for (const name of names) {
        const value = process.env[name];

        if (value?.trim()) {
            return value.trim();
        }
    }

    return undefined;
}
