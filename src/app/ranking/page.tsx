"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import REST from "@/modules/rest";
import { useRouter } from "next/navigation";
import Loading from "@/components/loading";
import InOutAnimation from "@/components/InOutAnimation";
import { GetMaxProblemScore } from "@/modules/problemScore";
import Link from "next/link";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type RankingUser = RESTResponseMap["/api/ranking"][number];
type RankedUser = RankingUser & { "rank": number };

function coloringScore(score: number, max: number) {
    // God I 문제는 배제 후 step
    const step = score / (max - 180);

    if (step < 0.10) return "#ffffff";
    if (step < 0.20) return "#00a2ca";
    if (step < 0.30) return "#91ff65";
    if (step < 0.40) return "#fff672";
    if (step < 0.50) return "#ff7e7e";
    if (step < 0.60) return "#ff68ff";
    if (step < 0.70) return "linear-gradient(242deg, #ffcd9f, #ffa632)";
    if (step < 0.80) return "linear-gradient(242deg, #757575, #ffffff)";
    if (step < 0.90) return "linear-gradient(242deg, #fff2a8, #ffeb38)";
    if (step < 1.01) return "linear-gradient(242deg, #ffd166, #6ee7f9, #c084fc)";

    return "linear-gradient(90deg, #ff3737, #ff934b, #ffdd1f, #7bff00, #3df2ff, #2f4eff, #a83eff)";
}

function RankClassName(rank: number) {
    if (rank === 1) return `${css.rank} ${css.rankGold}`;
    if (rank === 2) return `${css.rank} ${css.rankSilver}`;
    if (rank === 3) return `${css.rank} ${css.rankBronze}`;

    return css.rank;
}

export default function Page() {
    const router = useRouter();
    const [user, setUser] = useState<APIUser>();
    const [ranking, setRanking] = useState<RESTResponseMap["/api/ranking"]>([]);
    const [maxScore, setMaxScore] = useState<number>(-1);
    const [search, setSearch] = useState("");

    const rankedUsers = useMemo<RankedUser[]>(
        () => ranking.map((value, index) => ({
            ...value,
            "rank": index + 1
        })),
        [ranking]
    );
    const myRank = user ? rankedUsers.find(value => value.id === user.id) : undefined;
    const filteredRanking = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();
        if (!normalizedSearch) return rankedUsers;

        return rankedUsers.filter(value => value.displayName.toLocaleLowerCase().includes(normalizedSearch));
    }, [rankedUsers, search]);

    useEffect(() => {
        (async () => {
            const userResult = await REST("/api/me");
            if (userResult.success) setUser(userResult.data);

            const r = await REST("/api/ranking");
            if (!r.success) {
                alert("랭킹 불러오기에 실패했어요...");
                return router.back();
            }

            setRanking(r.data);
            setMaxScore(await GetMaxProblemScore());
        })();
    }, []);

    useEffect(() => console.log("maxScore", maxScore), [maxScore]);

    if (ranking.length === 0 || maxScore < 0) return <div style={{ "width": "100vw", "height": "calc(100dvh - 65px)" }}><Loading /></div>;

    return <>
        <Header />
        <InOutAnimation animate className={css.container}>
            <div className={css.search}>
                <input
                    type="text"
                    className={css.searchBox}
                    value={search}
                    onChange={(ev) => setSearch(ev.currentTarget.value)}
                    placeholder="유저 이름으로 검색..."
                />
            </div>
            <section className={css.users}>
                <span className={css.sectionTitle}>내 등수</span>
                {myRank ? <RankingRow
                    value={myRank}
                    maxScore={maxScore}
                    currentUserId={user?.id}
                /> : <div className={css.empty}>아직 등수에 없어요</div>}
            </section>
            <div className={css.users}>
                <span className={css.sectionTitle}>전체 등수</span>
                {filteredRanking.length > 0
                    ? filteredRanking.map(value => <RankingRow
                        key={value.id}
                        value={value}
                        maxScore={maxScore}
                        currentUserId={user?.id}
                    />)
                    : <div className={css.empty}>검색 결과가 없어요</div>}
            </div>
        </InOutAnimation>
    </>;
}

function RankingRow({
    value,
    maxScore,
    currentUserId
}: {
    "value": RankedUser,
    "maxScore": number,
    "currentUserId"?: string
}) {
    return <Link className={css.user} href={currentUserId === value.id ? "/users/@me" : `/users/${value.id}`}>
        <span className={RankClassName(value.rank)}>{value.rank}</span>
        <img
            className={css.profile}
            src={value.profile ?? "https://cdn.discordapp.com/embed/avatars/0.png"}
            alt={`${value.displayName}의 유저 프로필`}
        />
        <span className={css.name}>{value.displayName}</span>
        <span
            className={css.score}
            style={{ "--score-gradient": coloringScore(value.score, maxScore) } as CSSProperties}
        >
            {value.score}점
        </span>
        <FontAwesomeIcon className={css.icon} icon={faChevronRight} />
    </Link>;
}
