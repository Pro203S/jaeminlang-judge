import { NextRequest, NextResponse } from "next/server";

import {
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    clearAuthCookies,
    getAuthConfig,
    revokeToken,
} from "@/modules/discordAuth";
import type { AuthLogoutResponse } from "@/modules/discordAuthTypes";

export async function GET(request: NextRequest) {
    await revokeExistingTokens(request);

    const response = NextResponse.redirect(new URL("/", request.url));
    clearAuthCookies(response);

    return response;
}

export async function POST(request: NextRequest) {
    await revokeExistingTokens(request);

    const payload: AuthLogoutResponse = { success: true };
    const response = NextResponse.json(payload);
    clearAuthCookies(response);

    return response;
}

async function revokeExistingTokens(request: NextRequest) {
    let config;

    try {
        config = getAuthConfig(request.url);
    } catch {
        return;
    }

    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    const revocations: Promise<boolean>[] = [];

    if (accessToken) {
        revocations.push(revokeToken(config, accessToken, "access_token"));
    }

    if (refreshToken) {
        revocations.push(revokeToken(config, refreshToken, "refresh_token"));
    }

    await Promise.allSettled(revocations);
}
