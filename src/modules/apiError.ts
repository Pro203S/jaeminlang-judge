export type APIErrorResponse = {
    code: string;
    message: string;
};

export function createAPIErrorResponse(
    code: string,
    message: string,
): APIErrorResponse {
    return {
        code,
        message,
    };
}

export function toAPIErrorResponse(
    value: unknown,
    fallbackCode = "request_failed",
    fallbackMessage = "요청에 실패했습니다.",
): APIErrorResponse {
    if (isAPIErrorResponse(value)) {
        return value;
    }

    if (typeof value === "string") {
        return createAPIErrorResponse(fallbackCode, value || fallbackMessage);
    }

    if (typeof value !== "object" || value === null) {
        return createAPIErrorResponse(fallbackCode, fallbackMessage);
    }

    const data = value as Record<string, unknown>;
    const code =
        getString(data.code) ??
        getString(data.error) ??
        getNumberString(data.code) ??
        fallbackCode;
    const message =
        getString(data.message) ??
        getString(data.error_description) ??
        fallbackMessage;

    return createAPIErrorResponse(code, message);
}

function isAPIErrorResponse(value: unknown): value is APIErrorResponse {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const data = value as Partial<APIErrorResponse>;

    return typeof data.code === "string" && typeof data.message === "string";
}

function getString(value: unknown) {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();

    return trimmed || undefined;
}

function getNumberString(value: unknown) {
    return typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : undefined;
}
