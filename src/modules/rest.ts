import axios, { type AxiosRequestConfig } from "axios";
import { toAPIErrorResponse } from "./apiError";
import type { APIErrorResponse } from "./apiError";
import type {
    AuthCallbackResponse,
    AuthLoginResponse,
    AuthLogoutResponse,
    AuthMeResponse,
    AuthRefreshResponse,
} from "./pro203sAuthTypes";

type RESTResponseMap = {
    "/api/auth/login": AuthLoginResponse;
    "/api/auth/callback": AuthCallbackResponse;
    "/api/auth/refresh": AuthRefreshResponse;
    "/api/auth/logout": AuthLogoutResponse;
    "/api/me": AuthMeResponse;
};

export type RestResult<T> =
    | {
        success: true;
        data: T;
    }
    | {
        success: false;
        status: number;
        data: APIErrorResponse;
    };

export default function REST<Path extends keyof RESTResponseMap>(
    url: Path,
    config?: AxiosRequestConfig,
): Promise<RestResult<RESTResponseMap[Path]>>;
export default function REST<T>(
    url: string,
    config?: AxiosRequestConfig,
): Promise<RestResult<T>>;
export default async function REST<T>(
    url: string,
    config?: AxiosRequestConfig,
): Promise<RestResult<T>> {
    try {
        const response = await axios.request<T>({
            url,
            withCredentials: true,
            validateStatus: () => true,
            ...config,
        });

        if (response.status < 200 || response.status >= 300) {
            return {
                success: false,
                status: response.status,
                data: toAPIErrorResponse(
                    response.data,
                    `http_${response.status}`,
                    `요청에 실패했습니다. (${response.status})`,
                ),
            };
        }

        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        return {
            success: false,
            status: axios.isAxiosError(error) ? error.response?.status ?? 0 : 0,
            data: toAPIErrorResponse(
                axios.isAxiosError(error) ? error.response?.data ?? error.message : error,
            ),
        };
    }
}
