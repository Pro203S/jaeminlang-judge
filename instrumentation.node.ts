type GithubRelease = {
    id: number;
    tag_name: string;
    name: string | null;
    body: string | null;
    html_url: string;
    draft: boolean;
    prerelease: boolean;
    published_at: string | null;
    assets: {
        id: number;
        name: string;
        browser_download_url: string;
        size: number;
    }[];
};

import axios from "axios";
import { mkdir, writeFile } from "fs/promises";
import extract from "extract-zip";
import path from "path";
import { exec } from "child_process";

function execPromise(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(`"${command}" ${args.join(" ")}`, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(stdout);
        });
    });
}

function getPlatform() {
    let platform = '';
    switch (process.platform) {
        case "win32": platform = 'win'; break;
        case "linux": platform = 'linux'; break;
        case "darwin": platform = 'osx'; break;
        default: throw new Error("Unsupported platform.");
    }

    return `${platform}-${process.arch}`;
}

async function downloadFile(url: string, path: string): Promise<void> {
    const response = await axios.get<ArrayBuffer>(url, {
        responseType: "arraybuffer",
    });

    await writeFile(path, Buffer.from(response.data));
}

export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const releases = await axios.get<GithubRelease[]>("https://api.github.com/repos/Pro203S/jaeminlang/releases");
    const release = releases.data[0];

    console.log("[Instrumentation]", `detected platform: ${getPlatform()}`);
    console.log("[Instrumentation]", `latest jaeminlang version: ${release.tag_name}`);

    const found = release.assets.find(v => v.name.includes(getPlatform()));
    if (!found) throw new Error("jaeminlang platform not found.");

    await mkdir("./jaeminlang", { "recursive": true });

    console.log("[Instrumentation]", `downloading: ${found.browser_download_url}`);
    await downloadFile(found.browser_download_url, "./jaeminlang/bin.zip");

    console.log("[Instrumentation]", `extracting...`);
    await extract(path.join(process.cwd(), "./jaeminlang/bin.zip"), { "dir": path.join(process.cwd(), "./jaeminlang/bin") });

    if (process.platform !== "win32") {
        console.log("[Instrumentation]", "finalizing...");
        await execPromise("/bin/chmod", ["+x", path.join(process.cwd(), "./jaeminlang/bin/jaeminlang")]);
    }

    console.log("[Instrumentation]", `done`);
}