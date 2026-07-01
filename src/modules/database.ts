import * as fs from 'fs';
import Shadowly from 'shadowly';
import type { OAuthUserResponse, OAuthUserResult } from './discordAuthTypes';
import { normalizeDBProblem } from './problemAuthor';
import { CompareTier, TierToScore } from './tier';

const DATABASE_PATH = "./database.json";
const PROBLEMS_PATH = "./problems.json";

type LegacyDBUser = Omit<DBUser, "stat" | "drafts"> & {
    "stat"?: Partial<UserStat> & {
        "correct"?: number;
        "incorrect"?: number;
    };
    "drafts"?: DBUser["drafts"];
    "incorrectProblems"?: number[];
};

if (!fs.existsSync(DATABASE_PATH)) {
    fs.writeFileSync(DATABASE_PATH, JSON.stringify({
        "users": []
    } satisfies Database));
}

if (!fs.existsSync(PROBLEMS_PATH)) {
    fs.writeFileSync(PROBLEMS_PATH, JSON.stringify({
        "problems": []
    } satisfies ProblemsDatabase));
}

export const getDatabase = () => new Shadowly<Database>(DATABASE_PATH);
export const getProblemsDatabase = () => new Shadowly<ProblemsDatabase>(PROBLEMS_PATH);

export function sortProblemsByDifficulty(problems: DBProblem[]): DBProblem[] {
    return [...problems].sort((a, b) => CompareTier(a.tier, b.tier) || a.id - b.id);
}

export function getAllDBProblems(): DBProblem[] {
    const problems = getProblemsDatabase().get("problems");
    const values = problems.value();
    const normalized = values.map((value) => normalizeDBProblem(value));

    if (values.some((value) => !hasPersistedProblemAuthor(value))) {
        problems.set(normalized);
    }

    return normalized;
}

export function getDBProblemById(id: number): DBProblem | undefined {
    const problems = getProblemsDatabase().get("problems");
    const problemIndex = problems.findIndex((value) => value.id === id);
    if (problemIndex === -1) return undefined;

    const problemNode = problems.get(problemIndex);
    const normalized = normalizeDBProblem(problemNode.value());

    if (!hasPersistedProblemAuthor(problemNode.value())) {
        problemNode.set(normalized);
    }

    return normalized;
}

export function solvedProblemsToScore(problemIds: number[], problems: DBProblem[]): number {
    const problemScoreById = new Map(problems.map((problem) => [problem.id, TierToScore(problem.tier)]));
    return problemIds.reduce((score, problemId) => score + (problemScoreById.get(problemId) ?? 0), 0);
}

export function recalculateScoresForProblemSolvers(problemId: number, problems: DBProblem[]): void {
    const users = getDatabase().get("users");

    users.value().forEach((value, index) => {
        const user = normalizeDBUser(value);
        if (!user.problems.includes(problemId)) return;

        users.get(index).set({
            ...user,
            "score": solvedProblemsToScore(user.problems, problems)
        });
    });
}

export function removeProblemFromUsers(problemId: number, problems: DBProblem[]): void {
    const problemKey = String(problemId);
    const users = getDatabase().get("users");

    users.value().forEach((value, index) => {
        const user = normalizeDBUser(value);
        const nextProblems = user.problems.filter((value) => value !== problemId);

        if (nextProblems.length === user.problems.length && !(problemKey in user.drafts)) {
            return;
        }

        const nextDrafts = { ...user.drafts };
        delete nextDrafts[problemKey];

        users.get(index).set({
            ...user,
            "problems": nextProblems,
            "drafts": nextDrafts,
            "score": solvedProblemsToScore(nextProblems, problems),
        });
    });
}

function createOAuthUserResult(user: OAuthUserResponse): OAuthUserResult {
    return {
        "ok": true,
        "status": 200,
        "data": user
    };
}

export function createDefaultDBUser(user: OAuthUserResponse): DBUser {
    return {
        "id": user.id,
        "userData": createOAuthUserResult(user),
        "registerAt": Date.now(),
        "score": 0,
        "stat": {
            "corrects": 0,
            "submits": 0
        },
        "problems": [],
        "drafts": {}
    };
}

export function getDBUserById(id: string): DBUser | undefined {
    const userNode = getDatabase().get("users").find((value) => value.id === id);
    if (!userNode) return undefined;

    const normalized = normalizeDBUser(userNode.value());
    userNode.set(normalized);

    return normalized;
}

export function getOrCreateDBUser(user: OAuthUserResponse): DBUser {
    const users = getDatabase().get("users");
    const current = users.find((value) => value.id === user.id);

    if (current) {
        const currentUser = normalizeDBUser(current.value());
        const next: DBUser = {
            ...currentUser,
            "id": user.id,
            "userData": createOAuthUserResult(user),
            "drafts": currentUser.drafts ?? {}
        };
        current.set(next);
        return next;
    }

    const created = createDefaultDBUser(user);
    users.add(created);

    return created;
}

export function upsertOAuthUser(user: OAuthUserResponse): DBUser {
    return getOrCreateDBUser(user);
}

export function normalizeDBUser(value: DBUser | LegacyDBUser): DBUser {
    const legacyStat = (value.stat ?? {}) as Partial<UserStat> & {
        "correct"?: number;
    };
    const normalizedBase = { ...value } as LegacyDBUser;
    delete normalizedBase.incorrectProblems;

    return {
        ...normalizedBase,
        "stat": {
            "corrects": normalizeNumber(legacyStat.corrects ?? legacyStat.correct),
            "submits": normalizeNumber(legacyStat.submits)
        },
        "drafts": value.drafts ?? {}
    };
}

function normalizeNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hasPersistedProblemAuthor(problem: DBProblem) {
    const author = (problem as Partial<DBProblem>).author;

    return typeof author?.id === "string"
        && author.id.trim().length > 0
        && typeof author.displayName === "string"
        && author.displayName.trim().length > 0;
}
