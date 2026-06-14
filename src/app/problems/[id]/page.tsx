"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useEffect, useRef, useState } from "react";
import REST from "@/modules/rest";
import { useParams, useRouter } from "next/navigation";
import TierBadge from "@/components/tierbadge";
import InOutAnimation from "@/components/InOutAnimation";
import Button from "@/components/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faPaperPlane, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import Loading from "@/components/loading";
import { TierToScore } from "@/modules/tier";
import { ADMIN_ID } from "@/modules/constants";

const CONFETTI_PIECES = Array.from({ "length": 28 }, (_, index) => index);

export default function Page() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const saveTimeoutRef = useRef<number>(undefined);
    const lastSavedCodeRef = useRef("");
    const [user, setUser] = useState<APIUser>();
    const [problem, setProblem] = useState<APIProblem>();
    const [code, setCode] = useState("");
    const [submitResult, setSubmitResult] = useState<APISubmitResponse>();
    const [confettiRun, setConfettiRun] = useState(0);
    const lineNumbers = Array.from({ "length": code.split("\n").length }, (_, index) => index + 1);
    const submitStatus = submitResult
        ? submitResult.error
            ? submitResult.errorInOtherCase ? "다른 케이스에서 오류 발생" : "오류"
            : submitResult.correct
                ? "정답"
                : "오답"
        : "";

    useEffect(() => {
        (async () => {
            const r = await REST("/api/me");
            if (r.success) setUser(r.data);

            const r2 = await REST(`/api/problems/${id}`);
            if (!r2.success) {
                alert(r2.data.message);
                return router.back();
            }

            setProblem(r2.data);
            setCode(r2.data.savedCode ?? "");
            lastSavedCodeRef.current = r2.data.savedCode ?? "";
        })();
    }, []);

    useEffect(() => {
        if (confettiRun === 0) return;

        const timeout = window.setTimeout(() => setConfettiRun(0), 1500);
        return () => window.clearTimeout(timeout);
    }, [confettiRun]);

    useEffect(() => {
        if (!user || !problem) return;
        if (code === lastSavedCodeRef.current) return;

        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(async () => {
            const result = await REST(`/api/problems/${id}/draft`, {
                "method": "POST",
                "data": { code }
            });

            if (result.success) {
                lastSavedCodeRef.current = code;
            }
        }, 500);

        return () => window.clearTimeout(saveTimeoutRef.current);
    }, [code, id, problem, user]);

    return <>
        <Header sessionOverride={user} doNotRequest />
        {problem ? <InOutAnimation className={css.container} animate>
            <div className={css.problem}>
                <div className={css.problemLinearV}>
                    <div className={css.problemInfo}>
                        <div className={css.section}>
                            <div className={css.titleBox}>
                                <TierBadge tier={problem.tier} />
                                <span className={css.title}>{problem.name}</span>
                            </div>
                            {problem.description.split("\n").map((v, i) => <span className={css.desc} key={i}>{v}</span>)}
                            <span className={css.desc} style={{ "marginTop": "15px" }}>이 문제를 풀면 {TierToScore(problem.tier)}점을 얻어요.</span>
                        </div>
                        {problem.requireKeyword.length > 0 && <div className={css.section}>
                            <span className={css.title}>필수 키워드</span>
                            <div className={css.keywordList}>
                                {problem.requireKeyword.map((keyword) => <span className={css.keywordPill} key={keyword}>{keyword}</span>)}
                            </div>
                        </div>}
                        <div className={css.linearV}>
                            {problem.input && <div className={css.section}>
                                <span className={css.title}>입력</span>
                                <span className={css.subtitle}>설명</span>
                                <span className={css.desc}>{problem.input.description}</span>
                                <span className={css.subtitle}>실제 입력 값</span>
                                {problem.input.content.split("\n").map((v, i) => <span key={i} className={css.desc}>{v}</span>)}
                                <div style={{ "marginBottom": "auto" }} />
                            </div>}
                            {problem.output && <div className={css.section} style={{ "marginBottom": "auto" }}>
                                <span className={css.title}>출력</span>
                                <span className={css.subtitle}>설명</span>
                                <span className={css.desc}>{problem.output.description}</span>
                                <span className={css.subtitle}>실제 출력 값</span>
                                {problem.output.content.split("\n").map((v, i) => <span key={i} className={css.desc} style={{ "userSelect": "text", "width": "100%" }}>{v}</span>)}
                            </div>}
                        </div>
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
                                    // Tab키 핸들링
                                    if (ev.key === "Tab") {
                                        ev.preventDefault();

                                        const target = ev.currentTarget;
                                        const { selectionStart, selectionEnd } = target;
                                        const nextCode = `${code.slice(0, selectionStart)}  ${code.slice(selectionEnd)}`;

                                        setCode(nextCode);
                                        requestAnimationFrame(() => {
                                            target.setSelectionRange(selectionStart + 4, selectionStart + 4);
                                        });

                                        return;
                                    }

                                    // 습관성 Ctrl S 방지
                                    if (ev.ctrlKey && ev.key === "s") {
                                        ev.preventDefault();
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
                {submitResult && <div className={css.section}>
                    <span className={css.title}>실행 결과</span>
                    <span className={css.subtitle}>{submitStatus}</span>
                    {(submitResult.error || !submitResult.correct) && <pre className={css.outputBox}>
                        {submitResult.output || "출력 없음"}
                    </pre>}
                </div>}

                <div className={css.section} style={{ "width": "100%" }}>
                    <div className={css.buttons}>
                        <Button
                            className={css.submit}
                            href="/problems"
                        >
                            <FontAwesomeIcon icon={faChevronLeft} />
                            <span>뒤로가기</span>
                        </Button>
                        <div className={css.buttonGroup}>
                            {user?.id === ADMIN_ID && <Button
                                className={css.submit}
                                href={`/problems/${id}/edit`}
                            >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                <span>수정하기</span>
                            </Button>}
                            <Button
                                className={css.submit}
                                onClick={async () => {
                                    if (!user) {
                                        alert("제출하려면 로그인해주세요.");
                                        return;
                                    }

                                    const result = await REST(`/api/problems/${id}/submit`, {
                                        "method": "POST",
                                        "data": { code }
                                    });

                                    if (!result.success) {
                                        alert(result.data.message);
                                        return;
                                    }

                                    setSubmitResult(result.data);
                                    if (result.data.correct) setConfettiRun((run) => run + 1);
                                }}
                            >
                                <FontAwesomeIcon icon={faPaperPlane} />
                                <span>제출하기</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </InOutAnimation> : <div style={{ "width": "100vw", "height": "calc(100dvh - 65px)" }}><Loading /></div>}
        {confettiRun > 0 && <div key={confettiRun} className={css.confettiLayer} aria-hidden="true">
            {CONFETTI_PIECES.map((piece) => <span key={piece} className={css.confettiPiece} />)}
        </div>}
    </>;
}
