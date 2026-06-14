import type { OAuthUserResponse } from "./discordAuthTypes";

export const PROXY_AUTH_USER_HEADER = "x-jaeminlang-auth-user";

export function encodeProxyAuthUser(user: OAuthUserResponse) {
    return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export function decodeProxyAuthUser(headers: Headers): OAuthUserResponse | undefined {
    const value = headers.get(PROXY_AUTH_USER_HEADER);
    if (!value) return undefined;

    try {
        const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
        return isOAuthUserResponse(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function isOAuthUserResponse(value: unknown): value is OAuthUserResponse {
    if (typeof value !== "object" || value === null) return false;

    const data = value as Partial<OAuthUserResponse>;
    return (
        typeof data.id === "string" &&
        typeof data.username === "string" &&
        typeof data.displayName === "string" &&
        (data.profile === undefined || typeof data.profile === "string") &&
        (data.email === undefined || typeof data.email === "string")
    );
}
