"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useEffect, useState } from "react";
import REST from "@/modules/rest";
import { useRouter } from "next/navigation";
import InOutAnimation from "@/components/InOutAnimation";
import Button from "@/components/button";
import Loading from "@/components/loading";
import { ADMIN_ID, AVAILABLE_TAGS } from "@/modules/constants";
import { AVAILABLE_TIERS, TierToString } from "@/modules/tier";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faFloppyDisk, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

type IOState = {
    "description": string;
    "content": string;
};

type EditableCase = {
    "id": number;
    "in": string;
    "out": string;
};

type ProblemMutationPayload = Omit<DBProblem, "id" | "input" | "output"> & {
    "input"?: DBProblem["input"] | null;
    "output"?: DBProblem["output"] | null;
};

type Props =
    | {
        "mode": "create";
        "problemId"?: never;
    }
    | {
        "mode": "edit";
        "problemId": string;
    };

export default function ProblemEditor(props: Props) {
    const { mode } = props;
    const router = useRouter();
    const [user, setUser] = useState<APIUser>();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [tier, setTier] = useState<Tier>(AVAILABLE_TIERS[0]);
    const [tags, setTags] = useState<string[]>([]);
    const [problemInput, setProblemInput] = useState<IOState>({ "description": "", "content": "" });
    const [problemOutput, setProblemOutput] = useState<IOState>({ "description": "", "content": "" });
    const [cases, setCases] = useState<EditableCase[]>([{ "id": 1, "in": "", "out": "" }]);
    const [nextCaseId, setNextCaseId] = useState(2);
    const [isLoading, setLoading] = useState(true);
    const [isSubmitting, setSubmitting] = useState(false);

    const problemId = mode === "edit" ? props.problemId : undefined;
    const pageTitle = mode === "edit" ? "문제 수정" : "문제 만들기";
    const backHref = mode === "edit" && problemId ? `/problems/${problemId}` : "/problems";

    const loadProblem = (problem: APIProblem) => {
        const loadedCases = problem.cases?.length
            ? problem.cases.map((testCase, index) => ({
                "id": index + 1,
                "in": testCase.in ?? "",
                "out": testCase.out
            }))
            : [{ "id": 1, "in": "", "out": "" }];

        setName(problem.name);
        setDescription(problem.description);
        setTier(problem.tier);
        setTags(problem.tags ?? []);
        setProblemInput(toIOState(problem.input));
        setProblemOutput(toIOState(problem.output));
        setCases(loadedCases);
        setNextCaseId(loadedCases.length + 1);
    };

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const me = await REST("/api/me");
            if (cancelled) return;

            if (!me.success) {
                alert("로그인이 필요합니다.");
                router.back();
                return;
            }

            if (me.data.id !== ADMIN_ID) {
                alert("관리자만 문제를 관리할 수 있습니다.");
                router.back();
                return;
            }

            setUser(me.data);

            if (mode === "edit" && problemId) {
                const result = await REST(`/api/problems/${problemId}`);
                if (cancelled) return;

                if (!result.success) {
                    alert(result.data.message);
                    router.back();
                    return;
                }

                if (!result.data.cases) {
                    alert("테스트 케이스를 불러오지 못했습니다.");
                    router.back();
                    return;
                }

                loadProblem(result.data);
            }

            setLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [mode, problemId, router]);

    const toggleTag = (tag: string) => {
        setTags((current) => current.includes(tag)
            ? current.filter((value) => value !== tag)
            : [...current, tag]);
    };

    const updateCase = (caseId: number, key: "in" | "out", value: string) => {
        setCases((current) => current.map((testCase) => testCase.id === caseId
            ? { ...testCase, [key]: value }
            : testCase));
    };

    const addCase = () => {
        setCases((current) => [...current, { "id": nextCaseId, "in": "", "out": "" }]);
        setNextCaseId((current) => current + 1);
    };

    const removeCase = (caseId: number) => {
        setCases((current) => current.length === 1
            ? current
            : current.filter((testCase) => testCase.id !== caseId));
    };

    const submit = async () => {
        if (isSubmitting) return;

        if (!name.trim()) {
            alert("문제 이름을 입력해주세요.");
            return;
        }

        if (!description.trim()) {
            alert("문제 설명을 입력해주세요.");
            return;
        }

        if (cases.length === 0) {
            alert("테스트 케이스를 하나 이상 만들어주세요.");
            return;
        }

        const payload: ProblemMutationPayload = {
            tier,
            tags,
            "name": name.trim(),
            "description": description.trim(),
            "cases": cases.map((testCase) => ({
                ...(testCase.in ? { "in": testCase.in } : {}),
                "out": testCase.out
            }))
        };
        const input = optionalIO(problemInput);
        const output = optionalIO(problemOutput);

        if (mode === "edit") {
            payload.input = input ?? null;
            payload.output = output ?? null;
        } else {
            if (input) payload.input = input;
            if (output) payload.output = output;
        }

        setSubmitting(true);
        const result = await REST(mode === "edit" ? `/api/problems/${problemId}` : "/api/problems", {
            "method": mode === "edit" ? "PATCH" : "POST",
            "data": payload
        });
        setSubmitting(false);

        if (!result.success) {
            alert(result.data.message);
            return;
        }

        alert(mode === "edit" ? "문제를 수정했습니다." : "문제를 만들었습니다.");
        router.push(mode === "edit" ? `/problems/${problemId}` : "/problems");
    };

    if (isLoading) return <>
        <Header sessionOverride={user} doNotRequest />
        <div style={{ "width": "100vw", "height": "calc(100dvh - 65px)" }}>
            <Loading />
        </div>
    </>;

    return <>
        <Header sessionOverride={user} doNotRequest />
        <InOutAnimation className={css.container} animate>
            <div className={css.problem}>
                <div className={css.section}>
                    <span className={css.title}>{pageTitle}</span>
                    <div className={css.field}>
                        <label className={css.subtitle} htmlFor="problem-name">이름</label>
                        <input
                            id="problem-name"
                            className={css.input}
                            value={name}
                            onChange={(ev) => setName(ev.currentTarget.value)}
                            placeholder="문제 이름"
                        />
                    </div>
                    <div className={css.field}>
                        <label className={css.subtitle} htmlFor="problem-description">설명</label>
                        <textarea
                            id="problem-description"
                            className={css.textarea}
                            value={description}
                            onChange={(ev) => setDescription(ev.currentTarget.value)}
                            placeholder="문제 설명"
                        />
                    </div>
                </div>
                <div className={css.linearV}>
                    <div className={css.section}>
                        <label className={css.title} htmlFor="problem-tier">난이도</label>
                        <select
                            id="problem-tier"
                            className={css.select}
                            value={`${tier.category}:${tier.stage}`}
                            onChange={(ev) => {
                                const [category, stage] = ev.currentTarget.value.split(":");
                                const nextTier = AVAILABLE_TIERS.find((value) => value.category === category && String(value.stage) === stage);
                                if (nextTier) setTier(nextTier);
                            }}
                        >
                            {AVAILABLE_TIERS.map((value) => <option key={`${value.category}:${value.stage}`} value={`${value.category}:${value.stage}`}>
                                {TierToString(value)}
                            </option>)}
                        </select>
                    </div>
                    <div className={css.section}>
                        <span className={css.title}>태그</span>
                        <div className={css.tagList}>
                            {AVAILABLE_TAGS.map((tag) => <label className={css.tagOption} key={tag.value}>
                                <input
                                    type="checkbox"
                                    checked={tags.includes(tag.value)}
                                    onChange={() => toggleTag(tag.value)}
                                />
                                <span>{tag.label}</span>
                            </label>)}
                        </div>
                    </div>
                </div>
                <div className={css.linearV}>
                    <div className={css.section}>
                        <span className={css.title}>입력</span>
                        <div className={css.field}>
                            <label className={css.subtitle} htmlFor="input-description">설명</label>
                            <textarea
                                id="input-description"
                                className={css.textarea}
                                value={problemInput.description}
                                onChange={(ev) => {
                                    const { value } = ev.currentTarget;
                                    setProblemInput((current) => ({ ...current, "description": value }));
                                }}
                                placeholder="입력 설명"
                            />
                        </div>
                        <div className={css.field}>
                            <label className={css.subtitle} htmlFor="input-content">실제 입력 값</label>
                            <textarea
                                id="input-content"
                                className={css.textarea}
                                value={problemInput.content}
                                onChange={(ev) => {
                                    const { value } = ev.currentTarget;
                                    setProblemInput((current) => ({ ...current, "content": value }));
                                }}
                                placeholder="예시 입력"
                            />
                        </div>
                    </div>
                    <div className={css.section}>
                        <span className={css.title}>출력</span>
                        <div className={css.field}>
                            <label className={css.subtitle} htmlFor="output-description">설명</label>
                            <textarea
                                id="output-description"
                                className={css.textarea}
                                value={problemOutput.description}
                                onChange={(ev) => {
                                    const { value } = ev.currentTarget;
                                    setProblemOutput((current) => ({ ...current, "description": value }));
                                }}
                                placeholder="출력 설명"
                            />
                        </div>
                        <div className={css.field}>
                            <label className={css.subtitle} htmlFor="output-content">실제 출력 값</label>
                            <textarea
                                id="output-content"
                                className={css.textarea}
                                value={problemOutput.content}
                                onChange={(ev) => {
                                    const { value } = ev.currentTarget;
                                    setProblemOutput((current) => ({ ...current, "content": value }));
                                }}
                                placeholder="예시 출력"
                            />
                        </div>
                    </div>
                </div>
                <div className={css.section}>
                    <div className={css.titleRow}>
                        <span className={css.title}>테스트 케이스</span>
                        <button className={css.iconButton} type="button" onClick={addCase} aria-label="테스트 케이스 추가">
                            <FontAwesomeIcon icon={faPlus} />
                        </button>
                    </div>
                    <div className={css.caseList}>
                        {cases.map((testCase, index) => <div className={css.caseItem} key={testCase.id}>
                            <div className={css.caseHeader}>
                                <span className={css.subtitle}>케이스 {index + 1}</span>
                                <button
                                    className={css.iconButton}
                                    type="button"
                                    onClick={() => removeCase(testCase.id)}
                                    aria-label={`케이스 ${index + 1} 삭제`}
                                    disabled={cases.length === 1}
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                            <div className={css.caseGrid}>
                                <div className={css.field}>
                                    <label className={css.subtitle} htmlFor={`case-${testCase.id}-in`}>입력</label>
                                    <textarea
                                        id={`case-${testCase.id}-in`}
                                        className={css.textarea}
                                        value={testCase.in}
                                        onChange={(ev) => updateCase(testCase.id, "in", ev.currentTarget.value)}
                                        placeholder="stdin"
                                    />
                                </div>
                                <div className={css.field}>
                                    <label className={css.subtitle} htmlFor={`case-${testCase.id}-out`}>출력</label>
                                    <textarea
                                        id={`case-${testCase.id}-out`}
                                        className={css.textarea}
                                        value={testCase.out}
                                        onChange={(ev) => updateCase(testCase.id, "out", ev.currentTarget.value)}
                                        placeholder="stdout"
                                    />
                                </div>
                            </div>
                        </div>)}
                    </div>
                </div>
                <div className={css.section}>
                    <div className={css.buttons}>
                        <Button className={css.submit} href={backHref}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                            <span>뒤로가기</span>
                        </Button>
                        <Button className={css.submit} onClick={submit}>
                            <FontAwesomeIcon icon={faFloppyDisk} />
                            <span>{isSubmitting ? "저장 중" : mode === "edit" ? "수정하기" : "저장하기"}</span>
                        </Button>
                    </div>
                </div>
            </div>
        </InOutAnimation>
    </>;
}

function optionalIO(value: IOState) {
    if (!value.description.trim() && !value.content.trim()) return undefined;

    return {
        "description": value.description.trim(),
        "content": value.content
    };
}

function toIOState(value: APIProblem["input"]): IOState {
    return {
        "description": value?.description ?? "",
        "content": value?.content ?? ""
    };
}
