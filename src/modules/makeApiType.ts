export function MakeApiProblem(value: DBProblem): APIProblem {
    const a: any = {...value};
    delete a.cases;
    return a;
}
