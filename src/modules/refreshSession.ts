import rest from "./rest";

export async function refreshSession() {
    const result = await rest<{ success: boolean; error?: string }>(
        "/api/auth/refresh",
        {
            method: "POST",
        },
    );

    if (result.success) {
        return result.data;
    }

    return {
        success: false,
        error: "refresh_failed",
    };
}
