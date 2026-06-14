import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type MarkdownDoc = {
    id: string;
    title: string;
    description: string;
    content: string;
};

const DOCS_DIRECTORY = path.join(process.cwd(), "docs");
const DOC_ID_PATTERN = /^[a-zA-Z0-9가-힣_-]+$/;

export async function getMarkdownDocIds() {
    const entries = await readDocsDirectory();

    return entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
        .map((entry) => path.basename(entry.name, path.extname(entry.name)))
        .filter(isSafeDocId)
        .sort((a, b) => a.localeCompare(b));
}

export async function getMarkdownDocs() {
    const docs = await Promise.all((await getMarkdownDocIds()).map((id) => getMarkdownDoc(id)));

    return docs
        .filter((doc): doc is MarkdownDoc => doc !== undefined)
        .sort((a, b) => a.title.localeCompare(b.title, "ko"));
}

export async function getMarkdownDoc(id: string) {
    if (!isSafeDocId(id)) return undefined;

    try {
        const raw = await readFile(path.join(DOCS_DIRECTORY, `${id}.md`), "utf8");
        return parseMarkdownDoc(id, raw);
    } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") return undefined;
        throw error;
    }
}

function parseMarkdownDoc(id: string, raw: string): MarkdownDoc {
    const { content, metadata } = stripFrontMatter(raw);
    const title = metadata.title || getFirstHeading(content) || id;

    return {
        id,
        title,
        "description": metadata.description || getFirstParagraph(content),
        content
    };
}

function stripFrontMatter(raw: string) {
    const normalized = raw.replace(/\r\n/g, "\n");
    if (!normalized.startsWith("---\n")) {
        return {
            "content": normalized,
            "metadata": {} as Record<string, string>
        };
    }

    const end = normalized.indexOf("\n---", 4);
    if (end === -1) {
        return {
            "content": normalized,
            "metadata": {} as Record<string, string>
        };
    }

    const metadata = Object.fromEntries(normalized
        .slice(4, end)
        .split("\n")
        .map((line) => line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/))
        .filter((match): match is RegExpMatchArray => match !== null)
        .map((match) => [match[1], match[2].trim()]));

    return {
        "content": normalized.slice(end + 4).replace(/^\n/, ""),
        metadata
    };
}

function getFirstHeading(content: string) {
    return content
        .split("\n")
        .find((line) => line.startsWith("# "))
        ?.replace(/^#\s+/, "")
        .trim() ?? "";
}

function getFirstParagraph(content: string) {
    return content
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .find((block) => block && !block.startsWith("#") && !block.startsWith("```"))
        ?.replace(/\s+/g, " ")
        .replace(/[`*_#[\]()]/g, "")
        .slice(0, 180) ?? "";
}

function isSafeDocId(id: string) {
    return DOC_ID_PATTERN.test(id);
}

async function readDocsDirectory() {
    try {
        return await readdir(DOCS_DIRECTORY, { "withFileTypes": true });
    } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") return [];
        throw error;
    }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error && "code" in error;
}
