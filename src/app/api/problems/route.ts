import { APIErrorResponse } from "@/modules/apiError";
import { getDatabase } from "@/modules/database";
import { MakeApiProblem } from "@/modules/makeApiType";
import { POSTApiProblems } from "@/modules/zod";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const database = getDatabase();
        const problems = database.get("problems").value();
        return NextResponse.json(problems.map(MakeApiProblem));
    } catch (err) {
        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const parsed = POSTApiProblems.safeParse(await req.json());
        if (!parsed.success) return NextResponse.json({
            "code": "type_mismatch",
            "message": "Malformed body"
        }, { "status": 400 });

        const database = getDatabase().get("problems");
        
    } catch (err) {
        const e = err as Error;
        return NextResponse.json({
            "code": e.name,
            "message": e.message
        } satisfies APIErrorResponse, { "status": 500 });
    }
}