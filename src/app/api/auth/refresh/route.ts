import { NextRequest, NextResponse } from "next/server";

import {
    REFRESH_TOKEN_COOKIE,
    clearAuthCookies,
    getAuthConfig,
    requestToken,
    setTokenCookies,
} from "@/modules/pro203sAuth";

export async function POST(request: NextRequest) {
    let config;

    try {
        config = getAuthConfig(request.url);
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: "server_misconfigured",
                message: error instanceof Error ? error.message : "OAuth 설정이 없습니다.",
            },
            { status: 500 },
        );
    }

    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshToken) {
        return NextResponse.json(
            {
                success: false,
                error: "missing_refresh_token",
            },
            { status: 401 },
        );
    }

    const tokenResult = await requestToken(config, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    });

    if (!tokenResult.ok) {
        const response = NextResponse.json(
            {
                success: false,
                error: "refresh_failed",
                detail: tokenResult.data,
            },
            { status: tokenResult.status },
        );
        clearAuthCookies(response);

        return response;
    }

    const response = NextResponse.json({ success: true });
    setTokenCookies(response, tokenResult.data);

    return response;
}
