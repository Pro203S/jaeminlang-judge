import { spawn as spawnProc } from "child_process";
import path from "path";
import * as fs from 'fs/promises';

const EXECUTION_TIMEOUT_MS = 5000;
const MAX_OUTPUT_LENGTH = 1024 * 1024;
const JAEMINLANG_FILENAME = process.platform === "win32" ? "jaeminlang.exe" : "jaeminlang";

type Option = {
    "libraries"?: {
        "filename": string,
        "code": string
    }[],
    "stdin"?: string
};

type SpawnResultTrue = {
    "success": true,
    "data": string
};
type SpawnResultFalse = {
    "success": false,
    "data": string
}

type SpawnResult = SpawnResultTrue | SpawnResultFalse;

function spawn(command: string, args: string[], stdin?: string) {
    return new Promise<SpawnResult>((resolve) => {
        const c = spawnProc(command, args, {
            "timeout": EXECUTION_TIMEOUT_MS
        });

        let stderr = "";
        let stdout = "";
        let handleClose = true;

        c.on("close", (code) => {
            if (!handleClose) return;
            if (code && code !== 0) return resolve({
                "success": false,
                "data": stderr.slice(stderr.indexOf("]") + 1, stderr.indexOf("at jaeminlang")).trim()
            });

            return resolve({
                "success": true,
                "data": stdout.trim()
            });
        });

        c.stderr.on("data", (data) => stderr += data);
        c.stdout.on("data", (data) => {
            stdout += data;
            if (stdout.length >= MAX_OUTPUT_LENGTH) {
                resolve({
                    "success": false,
                    "data": stdout.trim()
                });
                handleClose = false;
                c.kill('SIGTERM');
                return;
            }
        });

        if (stdin) c.stdin.write(stdin, (err) => resolve({
            "success": false,
            "data": err ? err.message : "Unknown error"
        }));
    });
}

export async function RunJaeminlang(code: string, option: Option) {
    const jmlPath = path.join(process.cwd(), "jaeminlang", "bin", JAEMINLANG_FILENAME);
    const tmpPath = path.join(process.cwd(), "temp", String(Date.now() + Math.round(Math.random() * 1000000)));

    try {
        const { libraries, stdin } = option;

        await fs.mkdir(tmpPath, { "recursive": true });

        for await (const lib of (libraries ?? [])) {
            await fs.writeFile(path.join(tmpPath, lib.filename), lib.code, "utf-8");
        }

        const codePath = path.join(tmpPath, "code.jml");
        await fs.writeFile(codePath, code, "utf-8");

        return await spawn(jmlPath, [codePath], stdin);
    } finally {
        await fs.rm(tmpPath, { "recursive": true, "force": true });
    }
}