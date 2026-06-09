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
        const payload: AuthSessionResponse = {
            authenticated: false,
            error: "server_misconfigured",
            message: error instanceof Error ? error.message : "OAuth 설정이 없습니다.",
        };

        return NextResponse.json(payload, { status: 500 });
    }

    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
        const payload: AuthSessionResponse = { authenticated: false };

        return NextResponse.json(payload);
    }

    const userResult = await fetchCurrentUser(config, accessToken);

    if (userResult.ok) {
        const payload: AuthSessionResponse = {
            authenticated: true,
            user: userResult.data,
        };

        return NextResponse.json(payload);
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
            const payload: AuthSessionResponse = refreshedUserResult.ok
                ? {
                      authenticated: true,
                      user: refreshedUserResult.data,
                  }
                : {
                      authenticated: false,
                      error: refreshedUserResult.data,
                  };
            const response = NextResponse.json(payload);

            setTokenCookies(response, refreshResult.data);

            if (!refreshedUserResult.ok) {
                clearAuthCookies(response);
            }

            return response;
        }
    }

    const payload: AuthSessionResponse = {
        authenticated: false,
        error: userResult.data,
    };
    const response = NextResponse.json(payload, {
        status: userResult.status === 401 ? 200 : userResult.status,
    });
    clearAuthCookies(response);

    return response;
}
