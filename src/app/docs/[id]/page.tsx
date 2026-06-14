import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Header from "@/components/header";
import Markdown from "@/components/markdown";
import { getMarkdownDoc, getMarkdownDocIds } from "@/modules/docs";

import css from "../page.module.css";

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
    return (await getMarkdownDocIds()).map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const doc = await getMarkdownDoc(id);

    if (!doc) return {};

    return {
        "title": `${doc.title} - jaeminlang judge`,
        "description": doc.description
    };
}

export default async function Page({ params }: Props) {
    const { id } = await params;
    const doc = await getMarkdownDoc(id);
    if (!doc) notFound();

    const content = doc.content.match(/^#\s+/m)
        ? doc.content
        : `# ${doc.title}\n\n${doc.content}`;

    return <>
        <Header />
        <main className={css.container}>
            <div className={css.toolbar}>
                <Link className={css.backLink} href="/docs">문서 목록</Link>
            </div>
            <section className={css.section}>
                <Markdown content={content} />
            </section>
        </main>
    </>;
}
