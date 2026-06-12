import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { APIErrorResponse, createAPIErrorResponse } from "@/modules/apiError";
import { createDefaultDBUser, getDatabase, getProblemsDatabase } from "@/modules/database";
import {
    Pro203SSessionError,
    attachSessionCookies,
    getCurrentSession
} from "@/modules/pro203sAuth";
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
const JAEMINLANG_EXECUTABLE_CANDIDATES = [
    "jaeminlang.exe",
    "jaeminlang"
];

export async function POST(req: NextRequest, { params }: Params) {
    let codePath: string | undefined;

    try {
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

        const session = await getCurrentSession(req);
        const root = process.cwd();
        const tempDir = path.join(root, "temp");
        const jaeminlangPath = resolveJaeminlangExecutable(root);

        if (!jaeminlangPath) {
            return attachSessionCookies(NextResponse.json(
                createAPIErrorResponse("jaeminlang_not_found", "재민랭 실행 파일을 찾지 못했습니다."),
                { "status": 500 },
            ), session);
        }

        await mkdir(tempDir, { "recursive": true });

        const fileName = `code-${Date.now() + Math.floor(Math.random() * 100000)}.txt`;
        codePath = path.join(tempDir, fileName);
        await writeFile(codePath, parsed.data.code, "utf8");

        let passed = 0;
        let hasExecutionError = false;
        let executionOutput = "";
        let debugOutput = "";

        for (const testCase of problem.cases) {
            const result = await runJaeminlang(
                jaeminlangPath,
                tempDir,
                fileName,
                testCase.in ?? "",
            );

            if (result.timedOut || result.exitCode !== 0) {
                hasExecutionError = true;
                executionOutput = getExecutionOutput(result);
                break;
            }

            if (normalizeOutput(result.stdout) !== normalizeOutput(testCase.out)) {
                break;
            }

            passed += 1;
        }

        const correct = passed === problem.cases.length;
        if (!correct && !hasExecutionError) {
            const sampleResult = await runJaeminlang(
                jaeminlangPath,
                tempDir,
                fileName,
                problem.input?.content ?? "",
            );

            debugOutput = sampleResult.exitCode === 0 && !sampleResult.timedOut
                ? normalizeOutput(sampleResult.stdout)
                : formatExecutionOutput(getExecutionOutput(sampleResult));
        }

        const userNode = getOrCreateUserNode(session.user);
        const currentUser = userNode.value();
        const alreadySolved = currentUser.problems.includes(problem.id);
        const nextUser: DBUser = correct
            ? {
                ...currentUser,
                "score": currentUser.score + (alreadySolved ? 0 : TierToScore(problem.tier)),
                "stat": {
                    ...currentUser.stat,
                    "correct": currentUser.stat.correct + 1,
                    "submits": currentUser.stat.submits + 1
                },
                "problems": alreadySolved
                    ? currentUser.problems
                    : [...currentUser.problems, problem.id],
                "drafts": {
                    ...(currentUser.drafts ?? {}),
                    [String(problem.id)]: parsed.data.code
                }
            }
            : {
                ...currentUser,
                "stat": {
                    ...currentUser.stat,
                    "submits": currentUser.stat.submits + 1
                },
                "drafts": {
                    ...(currentUser.drafts ?? {}),
                    [String(problem.id)]: parsed.data.code
                }
            };

        userNode.set(nextUser);

        const payload: APISubmitResponse = {
            correct,
            "error": hasExecutionError,
            "output": hasExecutionError
                ? formatExecutionOutput(executionOutput)
                : debugOutput
        };

        return attachSessionCookies(NextResponse.json(payload), session);
    } catch (err) {
        if (err instanceof Pro203SSessionError) {
            return NextResponse.json({
                "code": err.status === 401 ? "unauthorized" : err.detail.code,
                "message": err.detail.message
            } satisfies APIErrorResponse, { "status": err.status });
        }

        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    } finally {
        if (codePath) await deleteTempFile(codePath);
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
    const binDir = path.join(root, "jaeminlang", "bin");

    for (const candidate of JAEMINLANG_EXECUTABLE_CANDIDATES) {
        const executablePath = path.join(binDir, candidate);
        if (existsSync(executablePath)) return executablePath;
    }

    return null;
}

async function deleteTempFile(filePath: string) {
    try {
        await rm(filePath, { "force": true });
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
