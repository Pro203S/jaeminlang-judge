import * as fs from 'fs';
import Shadowly from 'shadowly';
import type { OAuthUserResponse, OAuthUserResult } from './pro203sAuthTypes';

if (!fs.existsSync("./database.json")) {
    fs.writeFileSync("./database.json", JSON.stringify({
        "problems": [],
        "users": []
    } satisfies Database));
}

export const getDatabase = () => new Shadowly<Database>("./database.json");

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
            "correct": 0,
            "incorrect": 0,
            "submits": 0
        },
        "problems": []
    };
}

export function getDBUserById(id: string): DBUser | undefined {
    return getDatabase().get("users").find((value) => value.id === id)?.value();
}

export function getOrCreateDBUser(user: OAuthUserResponse): DBUser {
    const users = getDatabase().get("users");
    const current = users.find((value) => value.id === user.id);

    if (current) {
        const next: DBUser = {
            ...current.value(),
            "id": user.id,
            "userData": createOAuthUserResult(user)
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
