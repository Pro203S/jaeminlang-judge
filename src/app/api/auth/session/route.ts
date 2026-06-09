import { NextRequest, NextResponse } from "next/server";

import {
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    clearAuthCookies,
    fetchCurrentUser,
    getAuthConfig,
    requestToken,
    setTokenCookies,
} from "@/modules/pro203sAuth";

export async function GET(request: NextRequest) {
    let config;

    try {
        config = getAuthConfig(request.url);
    } catch (error) {
        return NextResponse.json(
            {
                authenticated: false,
                error: "server_misconfigured",
                message: error instanceof Error ? error.message : "OAuth 설정이 없습니다.",
            },
            { status: 500 },
        );
    }

    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
        return NextResponse.json({ authenticated: false });
    }

    const userResult = await fetchCurrentUser(config, accessToken);

    if (userResult.ok) {
        return NextResponse.json({
            authenticated: true,
            user: userResult.data,
        });
    }

    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (userResult.status === 401 && refreshToken) {
        const refreshResult = await requestToken(config, {
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        });

        if (refreshResult.ok) {
            const refreshedUserResult = await fetchCurrentUser(
                config,
                refreshResult.data.access_token,
            );
            const response = NextResponse.json({
                authenticated: refreshedUserResult.ok,
                user: refreshedUserResult.ok ? refreshedUserResult.data : undefined,
            });

            setTokenCookies(response, refreshResult.data);

            if (!refreshedUserResult.ok) {
                clearAuthCookies(response);
            }

            return response;
        }
    }

    const response = NextResponse.json(
        {
            authenticated: false,
            error: userResult.data,
        },
        { status: userResult.status === 401 ? 200 : userResult.status },
    );
    clearAuthCookies(response);

    return response;
}
