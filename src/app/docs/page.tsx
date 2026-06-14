import Link from "next/link";

import Header from "@/components/header";
import { getMarkdownDocs } from "@/modules/docs";

import css from "./page.module.css";

export default async function Page() {
    const docs = await getMarkdownDocs();

    return <>
        <Header />
        <main className={css.container}>
            <section className={css.section}>
                <span className={css.title}>문서</span>
                {docs.length > 0
                    ? <div className={css.docList}>
                        {docs.map((doc) => <Link className={css.docItem} href={`/docs/${doc.id}`} key={doc.id}>
                            <span className={css.docTitle}>{doc.title}</span>
                            {doc.description && <span className={css.docDesc}>{doc.description}</span>}
                        </Link>)}
                    </div>
                    : <span className={css.desc}>아직 문서가 없습니다.</span>}
            </section>
        </main>
    </>;
}
