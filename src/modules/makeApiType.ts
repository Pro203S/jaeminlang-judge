import { getProblemsDatabase, normalizeDBUser } from "./database";

type MakeApiProblemOptions = {
    "savedCode"?: string;
    "includeCases"?: boolean;
};

export function MakeApiProblem(value: DBProblem, options: MakeApiProblemOptions = {}): APIProblem {
    const problem: APIProblem = {
        ...value,
        "tags": value.tags ?? [],
        "requireKeyword": value.requireKeyword ?? []
    };

    if (!options.includeCases) delete problem.cases;
    if (options.savedCode !== undefined) problem.savedCode = options.savedCode;

    return problem;
}

export function MakeApiUser(value: DBUser): APIUser {
    const user = normalizeDBUser(value);
    const problems = getProblemsDatabase().get("problems").value();
    const profile = user.userData.ok ? user.userData.data.profile : undefined;
    const displayName = user.userData.ok
        ? user.userData.data.displayName
        : user.id;

    return {
        "id": user.id,
        "displayName": displayName,
        ...(profile ? { "profile": profile } : {}),
        "registerAt": user.registerAt,
        "score": user.score,
        "stat": user.stat,
        "problems": user.problems
            .map((id) => problems.find((problem) => problem.id === id))
            .filter((problem): problem is DBProblem => problem !== undefined)
            .map((problem) => MakeApiProblem(problem))
    };
}
