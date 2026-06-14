import Link from "next/link";
import type { ReactNode } from "react";

import css from "./styles.module.css";

type Props = {
    content: string;
    className?: string;
};

export default function Markdown(props: Props) {
    return <article className={[css.markdown, props.className].filter(Boolean).join(" ")}>
        {renderBlocks(props.content)}
    </article>;
}

function renderBlocks(content: string): ReactNode[] {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const blocks: ReactNode[] = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
            index += 1;
            continue;
        }

        const codeFence = line.match(/^```(\S*)?\s*$/);
        if (codeFence) {
            const codeLines: string[] = [];
            index += 1;

            while (index < lines.length && !/^```\s*$/.test(lines[index])) {
                codeLines.push(lines[index]);
                index += 1;
            }

            if (index < lines.length) index += 1;

            blocks.push(<pre className={css.codeBlock} key={`code:${index}`}>
                <code>{codeLines.join("\n")}</code>
            </pre>);
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            blocks.push(renderHeading(heading[1].length, heading[2], `heading:${index}`));
            index += 1;
            continue;
        }

        if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
            blocks.push(<hr key={`hr:${index}`} />);
            index += 1;
            continue;
        }

        if (/^>\s?/.test(line)) {
            const quoteLines: string[] = [];

            while (index < lines.length && /^>\s?/.test(lines[index])) {
                quoteLines.push(lines[index].replace(/^>\s?/, ""));
                index += 1;
            }

            blocks.push(<blockquote key={`quote:${index}`}>
                {renderBlocks(quoteLines.join("\n"))}
            </blockquote>);
            continue;
        }

        if (/^\s*[-*]\s+/.test(line)) {
            const items: string[] = [];

            while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
                items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
                index += 1;
            }

            blocks.push(<ul key={`ul:${index}`}>
                {items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
            </ul>);
            continue;
        }

        if (/^\s*\d+\.\s+/.test(line)) {
            const items: string[] = [];

            while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
                items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
                index += 1;
            }

            blocks.push(<ol key={`ol:${index}`}>
                {items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
            </ol>);
            continue;
        }

        if (isTableStart(lines, index)) {
            const tableLines = [lines[index]];
            index += 2;

            while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
                tableLines.push(lines[index]);
                index += 1;
            }

            blocks.push(renderTable(tableLines, `table:${index}`));
            continue;
        }

        const paragraphLines: string[] = [];

        while (
            index < lines.length &&
            lines[index].trim() &&
            !isSpecialBlockStart(lines, index)
        ) {
            paragraphLines.push(lines[index].trim());
            index += 1;
        }

        blocks.push(<p key={`p:${index}`}>{renderInline(paragraphLines.join(" "))}</p>);
    }

    return blocks;
}

function renderHeading(level: number, text: string, key: string) {
    const children = renderInline(text);
    const id = slugify(text);

    switch (level) {
        case 1:
            return <h1 id={id} key={key}>{children}</h1>;
        case 2:
            return <h2 id={id} key={key}>{children}</h2>;
        case 3:
            return <h3 id={id} key={key}>{children}</h3>;
        case 4:
            return <h4 id={id} key={key}>{children}</h4>;
        case 5:
            return <h5 id={id} key={key}>{children}</h5>;
        default:
            return <h6 id={id} key={key}>{children}</h6>;
    }
}

function renderTable(lines: string[], key: string) {
    const [headerLine, ...bodyLines] = lines;
    const headers = splitTableRow(headerLine);

    return <div className={css.tableWrap} key={key}>
        <table>
            <thead>
                <tr>
                    {headers.map((header, index) => <th key={index}>{renderInline(header)}</th>)}
                </tr>
            </thead>
            <tbody>
                {bodyLines.map((line, rowIndex) => <tr key={rowIndex}>
                    {splitTableRow(line).map((cell, cellIndex) => <td key={cellIndex}>{renderInline(cell)}</td>)}
                </tr>)}
            </tbody>
        </table>
    </div>;
}

function renderInline(text: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    const pattern = /(`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

        if (match[2] !== undefined) {
            nodes.push(<code className={css.inlineCode} key={`code:${match.index}`}>{match[2]}</code>);
        } else if (match[3] !== undefined) {
            nodes.push(<strong key={`strong:${match.index}`}>{match[3]}</strong>);
        } else if (match[4] !== undefined) {
            nodes.push(<em key={`em:${match.index}`}>{match[4]}</em>);
        } else if (match[5] !== undefined && match[6] !== undefined) {
            nodes.push(renderLink(match[5], match[6], `link:${match.index}`));
        }

        lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return nodes;
}

function renderLink(label: string, href: string, key: string) {
    if (!isSafeLink(href)) return label;

    if (href.startsWith("/") || href.startsWith("#")) {
        return <Link href={href} key={key}>{label}</Link>;
    }

    return <a href={href} key={key} target="_blank" rel="noreferrer">{label}</a>;
}

function isSafeLink(href: string) {
    return href.startsWith("/")
        || href.startsWith("#")
        || href.startsWith("https://")
        || href.startsWith("http://")
        || href.startsWith("mailto:");
}

function isSpecialBlockStart(lines: string[], index: number) {
    const line = lines[index];

    return /^```/.test(line)
        || /^(#{1,6})\s+/.test(line)
        || /^\s*(-{3,}|\*{3,})\s*$/.test(line)
        || /^>\s?/.test(line)
        || /^\s*[-*]\s+/.test(line)
        || /^\s*\d+\.\s+/.test(line)
        || isTableStart(lines, index);
}

function isTableStart(lines: string[], index: number) {
    return lines[index]?.includes("|")
        && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] ?? "");
}

function splitTableRow(line: string) {
    return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[`*_#[\]()]/g, "")
        .replace(/[^\w가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
