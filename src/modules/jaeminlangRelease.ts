import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { JAEMINLANG_RELEASE_URL, JAEMINLANG_VERSION } from "./constants";

export type JaeminlangReleaseInfo = {
    version: string;
    releaseUrl: string;
    assetName?: string;
    updatedAt?: string;
};

const RELEASE_INFO_PATH = path.join(process.cwd(), "jaeminlang", "release.json");

export const FALLBACK_JAEMINLANG_RELEASE_INFO: JaeminlangReleaseInfo = {
    "version": JAEMINLANG_VERSION,
    "releaseUrl": JAEMINLANG_RELEASE_URL
};

export async function readJaeminlangReleaseInfo(): Promise<JaeminlangReleaseInfo> {
    try {
        const parsed = JSON.parse(await readFile(RELEASE_INFO_PATH, "utf8")) as Partial<JaeminlangReleaseInfo>;
        const version = normalizeVersion(parsed.version);

        if (!version) return FALLBACK_JAEMINLANG_RELEASE_INFO;

        return {
            "version": version,
            "releaseUrl": parsed.releaseUrl || getJaeminlangReleaseUrl(version),
            ...(parsed.assetName ? { "assetName": parsed.assetName } : {}),
            ...(parsed.updatedAt ? { "updatedAt": parsed.updatedAt } : {})
        };
    } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") return FALLBACK_JAEMINLANG_RELEASE_INFO;
        throw error;
    }
}

export async function writeJaeminlangReleaseInfo(info: JaeminlangReleaseInfo) {
    await mkdir(path.dirname(RELEASE_INFO_PATH), { "recursive": true });
    await writeFile(RELEASE_INFO_PATH, `${JSON.stringify(info, null, 2)}\n`, "utf8");
}

export function getJaeminlangReleaseUrl(version: string) {
    return `https://github.com/Pro203S/jaeminlang/releases/tag/${normalizeVersion(version) || JAEMINLANG_VERSION}`;
}

function normalizeVersion(value: unknown) {
    if (typeof value !== "string") return "";

    const trimmed = value.trim();
    if (!trimmed) return "";

    return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error && "code" in error;
}
