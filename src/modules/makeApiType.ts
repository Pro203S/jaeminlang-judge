import { getProblemsDatabase } from "./database";

export function MakeApiProblem(value: DBProblem, savedCode?: string): APIProblem {
    const a: any = { ...value, "tags": value.tags ?? [] };
    delete a.cases;
    if (savedCode !== undefined) a.savedCode = savedCode;
    return a;
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
            .map(MakeApiProblem)
    };
}
