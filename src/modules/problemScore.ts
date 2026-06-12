import REST from "./rest";
import { TierToScore } from "./tier";

type ScoredProblem = Pick<APIProblem, "tier">;

export function ProblemsToMaxScore(problems: ScoredProblem[]): number {
    return problems.reduce((score, problem) => score + TierToScore(problem.tier), 0);
}

export async function GetMaxProblemScore(): Promise<number> {
    const result = await REST("/api/problems");

    if (!result.success) {
        throw new Error(result.data.message);
    }

    return ProblemsToMaxScore(result.data);
}
