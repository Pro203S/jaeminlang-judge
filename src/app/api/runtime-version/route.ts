import { readJaeminlangReleaseInfo } from "@/modules/jaeminlangRelease";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    return NextResponse.json(await readJaeminlangReleaseInfo());
}
