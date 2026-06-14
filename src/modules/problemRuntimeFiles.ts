export function isProblemRuntimeFileName(value: string) {
    const name = value.trim();

    return name.length > 0
        && name !== "."
        && name !== ".."
        && !/[<>:"/\\|?*\x00-\x1F]/.test(name);
}

export function normalizeProblemRuntimeFiles(values: ProblemRuntimeFile[] = []) {
    return values
        .map((value) => ({
            "name": value.name.trim(),
            "content": value.content
        }))
        .filter((value) => isProblemRuntimeFileName(value.name));
}

export function getDuplicateProblemRuntimeFileNames(values: ProblemRuntimeFile[] = []) {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const value of values) {
        const name = value.name.trim();
        if (!name) continue;

        if (seen.has(name)) duplicates.add(name);
        else seen.add(name);
    }

    return [...duplicates];
}
