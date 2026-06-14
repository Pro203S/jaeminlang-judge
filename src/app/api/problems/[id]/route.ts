import { APIErrorResponse } from "@/modules/apiError";
import { ADMIN_ID } from "@/modules/constants";
import { getDBUserById, getProblemsDatabase, sortProblemsByDifficulty } from "@/modules/database";
import { MakeApiProblem } from "@/modules/makeApiType";
import { normalizeProblemRuntimeFiles } from "@/modules/problemRuntimeFiles";
import { DiscordSessionError, attachSessionCookies, getCurrentSession } from "@/modules/discordAuth";
import { normalizeRequiredKeywords } from "@/modules/requiredKeywords";
import { PATCHApiProblemsId } from "@/modules/zod";
import { NextRequest, NextResponse } from "next/server";

type Params = { "params": Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const problem = getProblemsDatabase().get("problems").find(v => v.id === Number(id))?.value?.();
        if (!problem) return NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 });

        let session: Awaited<ReturnType<typeof getCurrentSession>> | undefined;
        try {
            session = await getCurrentSession(req);
        } catch (err) {
            if (!(err instanceof DiscordSessionError)) throw err;
        }

        const savedCode = session
            ? getDBUserById(session.user.id)?.drafts?.[String(problem.id)]
            : undefined;
        const response = NextResponse.json(MakeApiProblem(problem, {
            savedCode,
            "includeCases": session?.user.id === ADMIN_ID,
            "includeRuntimeFiles": session?.user.id === ADMIN_ID
        }));

        return session ? attachSessionCookies(response, session) : response;
    } catch (err) {
        if (err instanceof DiscordSessionError) {
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
    }
}

export async function PATCH(req: NextRequest, { params }: Params) {
    try {
        const id = Number((await params).id);
        const parsed = PATCHApiProblemsId.safeParse(await req.json());
        if (!parsed.success) return NextResponse.json({
            "code": "type_mismatch",
            "message": parsed.error.message
        }, { "status": 400 });

        const session = await getCurrentSession(req);
        if (session.user.id !== ADMIN_ID) return attachSessionCookies(NextResponse.json({
            "code": "forbidden",
            "message": "관리자만 문제를 관리할 수 있습니다."
        }, { "status": 403 }), session);

        const database = getProblemsDatabase().get("problems");
        const originIndex = database.findIndex(v => v.id === id);
        if (originIndex === -1) return attachSessionCookies(NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 }), session);
        const origin = database.get(originIndex).value();

        const { input, output, requireKeyword, runtimeFiles, ...updates } = parsed.data;
        const prob: DBProblem = {
            ...origin,
            "requireKeyword": origin.requireKeyword ?? [],
            "runtimeFiles": origin.runtimeFiles ?? [],
            ...updates
        };
        if ("requireKeyword" in parsed.data && requireKeyword) {
            prob.requireKeyword = normalizeRequiredKeywords(requireKeyword);
        }
        if ("input" in parsed.data) {
            if (input === null) delete prob.input;
            else if (input !== undefined) prob.input = input;
        }
        if ("output" in parsed.data) {
            if (output === null) delete prob.output;
            else if (output !== undefined) prob.output = output;
        }
        if ("runtimeFiles" in parsed.data && runtimeFiles) {
            prob.runtimeFiles = normalizeProblemRuntimeFiles(runtimeFiles);
        }

        database.get(originIndex).set(prob);
        database.set(sortProblemsByDifficulty(database.value()));

        return attachSessionCookies(new NextResponse(null, { "status": 204 }), session);
    } catch (err) {
        if (err instanceof DiscordSessionError) {
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
    }
}

export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        const id = Number((await params).id);
        const session = await getCurrentSession(req);
        if (session.user.id !== ADMIN_ID) return attachSessionCookies(NextResponse.json({
            "code": "forbidden",
            "message": "관리자만 문제를 관리할 수 있습니다."
        }, { "status": 403 }), session);

        const database = getProblemsDatabase().get("problems");
        const originIndex = database.findIndex(v => v.id === id);
        if (originIndex === -1) return attachSessionCookies(NextResponse.json({
            "code": "not_found",
            "message": "문제를 찾지 못했습니다."
        }, { "status": 404 }), session);

        database.remove(originIndex);

        return attachSessionCookies(new NextResponse(null, { "status": 204 }), session);
    } catch (err) {
        if (err instanceof DiscordSessionError) {
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
    }
}
