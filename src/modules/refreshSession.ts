import REST from "./rest";
import type { APIErrorResponse } from "./apiError";
import type { AuthRefreshResponse } from "./pro203sAuthTypes";

export async function refreshSession(): Promise<AuthRefreshResponse | APIErrorResponse> {
    const result = await REST("/api/auth/refresh", {
        method: "POST",
    });

    if (result.success) {
        return result.data;
    }

    return result.data;
}
