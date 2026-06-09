import axios, { type AxiosRequestConfig } from "axios";

export default function rest<Path extends keyof AuthApiResponseMap>(
    url: Path,
    config?: AxiosRequestConfig,
): Promise<RestResult<AuthApiResponse<Path>>>;
export default function rest<T>(
    url: string,
    config?: AxiosRequestConfig,
): Promise<RestResult<T>>;
export default async function rest<T>(
    url: string,
    config?: AxiosRequestConfig,
): Promise<RestResult<T>> {
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
            data: response.data,
        };
    }

    return {
        success: true,
        data: response.data,
    };
}
