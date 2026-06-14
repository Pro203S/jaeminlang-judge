import { APIErrorResponse } from "@/modules/apiError";
import { getDatabase } from "@/modules/database";
import { MakeApiUser } from "@/modules/makeApiType";
import { DiscordSessionError } from "@/modules/discordAuth";
import { NextRequest, NextResponse } from "next/server";

type Params = { "params": Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const database = getDatabase();
        const users = database.get("users").value().sort((a, b) => b.score - a.score);
        const found = users.find(v => v.id === id);
        if (!found) return NextResponse.json({
            "code": "not_found",
            "message": "유저를 찾을 수 없습니다."
        }, { "status": 404 });

        return NextResponse.json(MakeApiUser(found));
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
