export function normalizeRequiredKeywords(values: string[] = []) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function getMissingRequiredKeywords(code: string, requiredKeywords: string[] = []) {
    const required = normalizeRequiredKeywords(requiredKeywords);
    if (!required.length) return [];

    const codeTokens = getCodeTokens(code);
    return required.filter((keyword) => !codeTokens.has(keyword));
}

function getCodeTokens(code: string) {
    return new Set(code
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("어이쿠"))
        .flatMap((line) => line.split(",").map((token) => token.trim()).filter(Boolean)));
}
