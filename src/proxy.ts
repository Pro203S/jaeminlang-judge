import { NextResponse, type NextRequest } from "next/server";

import type { APIErrorResponse } from "@/modules/apiError";
import {
    DiscordSessionError,
    attachSessionCookies,
    getCurrentSession,
} from "@/modules/discordAuth";
import { encodeProxyAuthUser, PROXY_AUTH_USER_HEADER } from "@/modules/proxyAuth";

export async function proxy(request: NextRequest) {
    try {
        const session = await getCurrentSession(request);
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set(PROXY_AUTH_USER_HEADER, encodeProxyAuthUser(session.user));

        const response = NextResponse.next({
            "request": {
                "headers": requestHeaders,
            },
        });

        return attachSessionCookies(response, session);
    } catch (err) {
        if (err instanceof DiscordSessionError) {
            return NextResponse.json({
                "code": err.status === 401 ? "unauthorized" : err.detail.code,
                "message": err.detail.message,
            } satisfies APIErrorResponse, { "status": err.status });
        }

        const error = err as Error;
        return NextResponse.json({
            "code": error.name,
            "message": error.message,
        } satisfies APIErrorResponse, { "status": 500 });
    }
}

export const config = {
    "matcher": "/api/problems/:id/submit",
};
