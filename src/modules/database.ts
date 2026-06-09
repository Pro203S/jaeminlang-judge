import * as fs from 'fs';
import Shadowly from 'shadowly';

if (!fs.existsSync("./database.json")) {
    fs.writeFileSync("./database.json", JSON.stringify({
        "problems": [],
        "users": []
    } satisfies Database));
}

export const getDatabase = () => new Shadowly<Database>("./database.json");