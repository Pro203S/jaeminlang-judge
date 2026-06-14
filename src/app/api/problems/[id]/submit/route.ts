import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { APIErrorResponse, createAPIErrorResponse } from "@/modules/apiError";
import { createDefaultDBUser, getDatabase, getProblemsDatabase, normalizeDBUser } from "@/modules/database";
import { normalizeProblemRuntimeFiles } from "@/modules/problemRuntimeFiles";
import { decodeProxyAuthUser } from "@/modules/proxyAuth";
import { getMissingRequiredKeywords } from "@/modules/requiredKeywords";
import { TierToScore } from "@/modules/tier";
import { POSTApiProblemsIdSubmit } from "@/modules/zod";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = { "params": Promise<{ id: string }> };

type RunResult = {
    "stdout": string;
    "stderr": string;
    "exitCode": number | null;
    "timedOut": boolean;
};

const EXECUTION_TIMEOUT_MS = 5000;
const MAX_OUTPUT_LENGTH = 1024 * 1024;
const JAEMINLANG_FILENAME = process.platform === "win32" ? "jaeminlang.exe" : "jaeminlang";

export async function POST(req: NextRequest, { params }: Params) {
    let submissionDir: string | undefined;

    try {
        const user = decodeProxyAuthUser(req.headers);
        if (!user) return NextResponse.json({
            "code": "unauthorized",
            "message": "로그인이 필요합니다."
        } satisfies APIErrorResponse, { "status": 401 });

        const parsed = POSTApiProblemsIdSubmit.safeParse(await req.json());
        if (!parsed.success) return NextResponse.json({
            "code": "type_mismatch",
            "message": parsed.error.message
        } satisfies APIErrorResponse, { "status": 400 });

        const { id } = await params;
        const problemId = Number(id);
        const problem = getProblemsDatabase().get("problems").find(v => v.id === problemId)?.value?.();

        if (!problem) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        } satisfies APIErrorResponse, { "status": 404 });

        for await (const problemCase of problem.cases) {
            
        }
    } catch (err) {
        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    } finally {
        if (submissionDir) await deleteTempDirectory(submissionDir);
    }
}

function getOrCreateUserNode(user: Parameters<typeof createDefaultDBUser>[0]) {
    const users = getDatabase().get("users");
    const current = users.find(v => v.id === user.id);

    if (current) return current;

    users.add(createDefaultDBUser(user));

    const created = users.find(v => v.id === user.id);
    if (!created) {
        throw new Error("유저 DB 생성에 실패했습니다.");
    }

    return created;
}

function resolveJaeminlangExecutable(root: string) {
    const executablePath = path.join(root, "jaeminlang", "bin", JAEMINLANG_FILENAME);
    if (existsSync(executablePath)) return executablePath;

    return null;
}

async function prepareProblemRuntimeFiles(problem: DBProblem, tempDir: string) {
    for (const file of normalizeProblemRuntimeFiles(problem.runtimeFiles ?? [])) {
        await writeFile(path.join(tempDir, file.name), file.content, "utf8");
    }
}

async function deleteTempDirectory(dirPath: string) {
    try {
        await rm(dirPath, { "force": true, "recursive": true });
    } catch {
    }
}

function runJaeminlang(
    executable: string,
    cwd: string,
    fileName: string,
    input: string,
): Promise<RunResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(executable, [fileName], {
            cwd,
            "windowsHide": true
        });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        let settled = false;
        const timeout = setTimeout(() => {
            timedOut = true;
            child.kill();
        }, EXECUTION_TIMEOUT_MS);

        child.stdout.on("data", (chunk: Buffer) => {
            stdout += chunk.toString("utf8");
            if (stdout.length > MAX_OUTPUT_LENGTH) {
                child.kill();
            }
        });

        child.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
        });

        child.on("error", (error) => {
            if (settled) return;

            settled = true;
            clearTimeout(timeout);
            reject(error);
        });

        child.on("close", (exitCode) => {
            if (settled) return;

            settled = true;
            clearTimeout(timeout);
            resolve({
                stdout,
                stderr,
                exitCode,
                timedOut
            });
        });

        child.stdin.end(input);
    });
}

function normalizeOutput(value: string) {
    return value.replace(/\r\n/g, "\n").trimEnd();
}

function getExecutionOutput(result: RunResult) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    if (output) return output;

    if (result.timedOut) return "실행 시간이 초과되었습니다.";
    return "재민랭이 오류와 함께 종료되었습니다.";
}

function formatExecutionOutput(output: string) {
    const lines = output
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map(line => line.trimEnd());

    const stackTraceIndex = lines.findIndex(line => /^\s*at\s+/.test(line));
    const relevantLines = stackTraceIndex >= 0 ? lines.slice(0, stackTraceIndex) : lines;

    return relevantLines
        .map(line => line.replace(/^\[[^\]]+\]\s*/, ""))
        .join("\n")
        .trim();
}
