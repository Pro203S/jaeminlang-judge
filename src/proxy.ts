import { NextResponse, type NextRequest } from "next/server";

import type { APIErrorResponse } from "@/modules/apiError";
import {
    DiscordSessionError,
    attachSessionCookies,
    clearAuthCookies,
    getCurrentSession,
} from "@/modules/discordAuth";
import { encodeProxyAuthUser, PROXY_AUTH_USER_HEADER } from "@/modules/proxyAuth";

export async function proxy(request: NextRequest) {
    const authMode = getAuthMode(request);

    if (authMode === "none") {
        return nextWithoutSession(request);
    }

    try {
        const session = await getCurrentSession(request);
        const response = attachSessionCookies(nextWithSession(request, session.user), session);

        if (request.nextUrl.pathname === "/api/me" && request.method === "DELETE") {
            clearAuthCookies(response);
        }

        return response;
    } catch (err) {
        if (authMode === "optional" && err instanceof DiscordSessionError) {
            return nextWithoutSession(request);
        }

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
    "matcher": [
        "/api/me",
        "/api/problems",
        "/api/problems/:id",
        "/api/problems/:id/draft",
        "/api/problems/:id/submit",
    ],
};

type AuthMode = "none" | "optional" | "required";
type ProxyUser = Parameters<typeof encodeProxyAuthUser>[0];

function getAuthMode(request: NextRequest): AuthMode {
    const { pathname } = request.nextUrl;

    if (pathname === "/api/me") return "required";
    if (pathname === "/api/problems") return request.method === "GET" ? "none" : "required";
    if (/^\/api\/problems\/[^/]+$/.test(pathname)) {
        return request.method === "GET" ? "optional" : "required";
    }
    if (/^\/api\/problems\/[^/]+\/(?:draft|submit)$/.test(pathname)) {
        return "required";
    }

    return "none";
}

function nextWithSession(request: NextRequest, user: ProxyUser) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(PROXY_AUTH_USER_HEADER, encodeProxyAuthUser(user));

    return NextResponse.next({
        "request": {
            "headers": requestHeaders,
        },
    });
}

function nextWithoutSession(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete(PROXY_AUTH_USER_HEADER);

    return NextResponse.next({
        "request": {
            "headers": requestHeaders,
        },
    });
}
