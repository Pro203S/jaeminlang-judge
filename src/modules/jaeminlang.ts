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
    "data": {
        "code": number,
        "error": string
    }
}

type SpawnResult = SpawnResultTrue | SpawnResultFalse;

function spawn(command: string, args: string[], stdin?: string) {
    return new Promise<SpawnResult>((resolve, reject) => {
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
                "data": {
                    "code": code,
                    "error": stderr
                }
            });

            return resolve({
                "success": true,
                "data": stdout
            });
        });

        c.stdout.on("data", (data) => {
            stdout += data;
            if (stdout.length >= MAX_OUTPUT_LENGTH) {
                reject(new Error("stdout too long"));
                handleClose = false;
                c.kill('SIGTERM');
                return;
            }
        });
        c.stderr.on("data", (data) => stderr += data);

        if (stdin) c.stdin.write(stdin, (err) => reject(err));
    });
}

export async function RunJaeminlang(code: string, option: Option) {
    const { libraries, stdin } = option;

    const jmlPath = path.join(process.cwd(), "jaeminlang", "bin", JAEMINLANG_FILENAME);
    const tmpPath = path.join(process.cwd(), "temp", String(Date.now() + Math.round(Math.random() * 1000000)));
    await fs.mkdir(tmpPath, { "recursive": true });

    for await (const lib of (libraries ?? [])) {
        await fs.writeFile(path.join(tmpPath, lib.filename), lib.code, "utf-8");
    }

    const codePath = path.join(tmpPath, "code.jml");
    await fs.writeFile(codePath, code, "utf-8");

    const result = await spawn(jmlPath, [codePath], stdin);
    if (!result.success) throw new Error(result.data.code + " " + result.data.error);

    return result.data;
}