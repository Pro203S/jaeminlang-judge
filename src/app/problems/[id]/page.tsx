"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useEffect, useRef, useState } from "react";
import REST from "@/modules/rest";
import { useParams, useRouter } from "next/navigation";
import TierBadge from "@/components/tierbadge";
import InOutAnimation from "@/components/InOutAnimation";

export default function Page() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const [user, setUser] = useState<APIUser>();
    const [problem, setProblem] = useState<APIProblem>();
    const [code, setCode] = useState("");
    const lineNumbers = Array.from({ "length": code.split("\n").length }, (_, index) => index + 1);

    useEffect(() => {
        (async () => {
            const r = await REST("/api/me");
            if (!r.success) return router.back();

            setUser(r.data);

            const r2 = await REST(`/api/problems/${id}`);
            if (!r2.success) {
                alert(r2.data.message);
                return router.back();
            }

            setProblem(r2.data);
        })();
    }, []);

    return <>
        <Header sessionOverride={user} doNotRequest />
        {problem && <InOutAnimation className={css.container} animate>
            <div className={css.problem}>
                <div className={css.section}>
                    <div className={css.titleBox}>
                        <TierBadge tier={problem.tier} />
                        <span className={css.title}>{problem.name}</span>
                    </div>
                    <span className={css.desc}>{problem.description}</span>
                </div>
                <div className={css.linearV}>
                    {problem.input && <div className={css.section}>
                        <span className={css.title}>입력</span>
                        <span className={css.subtitle}>설명</span>
                        <span className={css.desc}>{problem.input.description}</span>
                        <span className={css.subtitle}>실제 출력 값</span>
                        <span className={css.desc}>{problem.input.content}</span>
                    </div>}
                    {problem.output && <div className={css.section}>
                        <span className={css.title}>출력</span>
                        <span className={css.subtitle}>설명</span>
                        <span className={css.desc}>{problem.output.description}</span>
                        <span className={css.subtitle}>실제 출력 값</span>
                        <span className={css.desc} style={{ "userSelect": "text", "width": "100%" }}>{problem.output.content}</span>
                    </div>}
                </div>
                <div className={css.section}>
                    <label className={css.title} htmlFor="solution-code">코드</label>
                    <div className={css.codeEditorFrame}>
                        <div className={css.lineNumbers} ref={lineNumbersRef} aria-hidden="true">
                            {lineNumbers.map((lineNumber) => <span key={lineNumber}>{lineNumber}</span>)}
                        </div>
                        <textarea
                            id="solution-code"
                            className={css.codeEditor}
                            value={code}
                            spellCheck={false}
                            placeholder="코드를 입력하세요..."
                            onChange={(ev) => setCode(ev.currentTarget.value)}
                            onScroll={(ev) => {
                                if (!lineNumbersRef.current) return;

                                lineNumbersRef.current.scrollTop = ev.currentTarget.scrollTop;
                            }}
                            onKeyDown={(ev) => {
                                if (ev.key !== "Tab") return;

                                ev.preventDefault();

                                const target = ev.currentTarget;
                                const { selectionStart, selectionEnd } = target;
                                const nextCode = `${code.slice(0, selectionStart)}    ${code.slice(selectionEnd)}`;

                                setCode(nextCode);
                                requestAnimationFrame(() => {
                                    target.setSelectionRange(selectionStart + 4, selectionStart + 4);
                                });
                            }}
                        />
                    </div>
                </div>
            </div>
        </InOutAnimation>}
    </>;
}
