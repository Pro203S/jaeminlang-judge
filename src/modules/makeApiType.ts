import { getProblemsDatabase } from "./database";

type MakeApiProblemOptions = {
    "savedCode"?: string;
    "includeCases"?: boolean;
};

export function MakeApiProblem(value: DBProblem, options: MakeApiProblemOptions = {}): APIProblem {
    const problem: APIProblem = { ...value, "tags": value.tags ?? [] };

    if (!options.includeCases) delete problem.cases;
    if (options.savedCode !== undefined) problem.savedCode = options.savedCode;

    return problem;
}

export function MakeApiUser(value: DBUser): APIUser {
    const problems = getProblemsDatabase().get("problems").value();
    const profile = value.userData.ok ? value.userData.data.profile : undefined;
    const displayName = value.userData.ok
        ? value.userData.data.displayName
        : value.id;

    return {
        "id": value.id,
        "displayName": displayName,
        ...(profile ? { "profile": profile } : {}),
        "registerAt": value.registerAt,
        "score": value.score,
        "stat": value.stat,
        "problems": value.problems
            .map((id) => problems.find((problem) => problem.id === id))
            .filter((problem): problem is DBProblem => problem !== undefined)
            .map((problem) => MakeApiProblem(problem))
    };
}
