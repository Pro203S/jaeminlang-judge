export function MakeApiProblem(value: DBProblem): APIProblem {
    const a: any = {...value};
    delete a.cases;
    return a;
}

export function MakeApiUser(value: DBUser, problems: DBProblem[]): APIUser {
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
