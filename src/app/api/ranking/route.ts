import { APIErrorResponse } from "@/modules/apiError";
import { getDatabase } from "@/modules/database";
import { MakeApiUser } from "@/modules/makeApiType";
import { DiscordSessionError } from "@/modules/discordAuth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const database = getDatabase();
        const users = database.get("users").value().sort((a, b) => b.score - a.score);
        return NextResponse.json(users.map(v => ({
            ...MakeApiUser(v),
            "problems": undefined,
            "stat": undefined
        })));
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
