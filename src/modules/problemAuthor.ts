import { ADMIN_ID } from "./constants";
import type { OAuthUserResponse } from "./discordAuthTypes";

type UserWithId = { id: string } | null | undefined;
type ProblemWithOptionalAuthor = Omit<DBProblem, "author"> & {
    author?: ProblemAuthor;
};

export function createProblemAuthor(
    user: Pick<OAuthUserResponse, "id" | "displayName" | "profile">,
): ProblemAuthor {
    return {
        "id": user.id,
        "displayName": user.displayName,
        ...(user.profile ? { "profile": user.profile } : {}),
    };
}

export function createLegacyProblemAuthor(): ProblemAuthor {
    return {
        "id": ADMIN_ID,
        "displayName": "관리자",
    };
}

export function normalizeDBProblem(value: ProblemWithOptionalAuthor): DBProblem {
    return {
        ...value,
        "author": normalizeProblemAuthor(value.author),
    };
}

export function canManageProblem(
    problem: Pick<DBProblem, "author"> | Pick<APIProblem, "author">,
    user: UserWithId,
): boolean {
    const userId = user?.id;
    if (!userId) return false;

    return isAdminUser(user) || problem.author.id === userId;
}

export function isAdminUser(user: UserWithId): user is { id: string } {
    return user?.id === ADMIN_ID;
}

function normalizeProblemAuthor(value: ProblemAuthor | undefined): ProblemAuthor {
    if (!value?.id?.trim() || !value.displayName?.trim()) {
        return createLegacyProblemAuthor();
    }

    return {
        "id": value.id.trim(),
        "displayName": value.displayName.trim(),
        ...(value.profile?.trim() ? { "profile": value.profile.trim() } : {}),
    };
}
