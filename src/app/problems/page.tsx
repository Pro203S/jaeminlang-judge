"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useEffect, useRef, useState } from "react";
import REST from "@/modules/rest";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import Dropdown, { DropdownItem } from "@/components/dropdown";
import { animated, easings, useSpringValue } from "@react-spring/web";
import { AVAILABLE_TAGS, TAG_TO_STRING } from "@/modules/constants";
import { AVAILABLE_TIERS, TierToString } from "@/modules/tier";
import TierBadge from "@/components/tierbadge";
import Link from "next/link";

const AnimatedFA = animated(FontAwesomeIcon);

export default function Page() {
    const [user, setUser] = useState<APIUser>();
    const [search, setSearch] = useState("");
    const [filtered, setFiltered] = useState<APIProblem[]>([]);
    const problems = useRef<APIProblem[]>([]);

    const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
    const [selectedTag, setSelectedTag] = useState<string>();
    const tagArrowRotation = useSpringValue(0, {
        "config": {
            "duration": 250,
            "easing": easings.easeOutCubic
        }
    });
    useEffect(() => { tagArrowRotation.start(tagDropdownOpen ? -180 : 0) }, [tagDropdownOpen]);

    const [tierDropdownOpen, setTierDropdownOpen] = useState(false);
    const [selectedTier, setSelectedTier] = useState<Tier>();
    const tierArrowRotation = useSpringValue(0, {
        "config": {
            "duration": 250,
            "easing": easings.easeOutCubic
        }
    });
    useEffect(() => { tierArrowRotation.start(tierDropdownOpen ? -180 : 0) }, [tierDropdownOpen]);

    useEffect(() => {
        (async () => {
            const r = await REST("/api/me");
            if (!r.success) return;

            setUser(r.data);

            const r2 = await REST("/api/problems");
            if (!r2.success) return;

            problems.current = r2.data;
            setFiltered(r2.data);
        })();
    }, []);

    useEffect(() => {
        let f = [...problems.current];

        if (selectedTag) {
            f = f.filter(v => v.tags.includes(selectedTag));
        }

        if (selectedTier) {
            f = f.filter(v => v.tier.category === selectedTier.category && v.tier.stage === selectedTier.stage);
        }

        if (search) {
            f = f.filter(v => v.name.toLocaleLowerCase().includes(search));
        }

        setFiltered(f);
    }, [selectedTag, selectedTier, search]);

    return <>
        <Header sessionOverride={user} doNotRequest />
        <div className={css.container}>
            <div className={css.search}>
                <div className={css.linearV}>
                    <input
                        type="text"
                        className={css.searchBox}
                        onKeyDown={(ev) => setSearch(ev.currentTarget.value)}
                        placeholder="문제 이름으로 검색..."
                    />
                </div>
                <div className={css.linearV}>
                    <Dropdown
                        open={tagDropdownOpen}
                        setOpen={setTagDropdownOpen}
                        label="태그 선택"
                        items={[
                            {
                                "onClick": () => setSelectedTag(undefined),
                                "type": "button",
                                "label": "태그 선택"
                            },
                            ...AVAILABLE_TAGS.map(v => ({
                                "onClick": () => setSelectedTag(v.value),
                                "type": "button",
                                "label": v.label
                            }) as DropdownItem)
                        ]}
                    >
                        <span>{AVAILABLE_TAGS.find(v => v.value === selectedTag)?.label ?? "태그 선택"}</span>
                        <AnimatedFA icon={faChevronDown} style={{ "transform": tagArrowRotation.to(v => `rotate(${v}deg)`) }} />
                    </Dropdown>
                    <Dropdown
                        open={tierDropdownOpen}
                        setOpen={setTierDropdownOpen}
                        label="난이도 선택"
                        items={[
                            {
                                "onClick": () => setSelectedTier(undefined),
                                "type": "button",
                                "label": "난이도 선택"
                            },
                            ...AVAILABLE_TIERS.map(v => ({
                                "onClick": () => setSelectedTier(v),
                                "type": "button",
                                "label": TierToString(v)
                            }) as DropdownItem)
                        ]}
                    >
                        <span>{selectedTier ? TierToString(selectedTier) : "난이도 선택"}</span>
                        <AnimatedFA icon={faChevronDown} style={{ "transform": tierArrowRotation.to(v => `rotate(${v}deg)`) }} />
                    </Dropdown>
                </div>
            </div>
            <div className={css.problems}>
                {filtered.length > 0 ?
                    filtered
                        .map(v => <Link className={css.problem} key={v.id} href={`/problems/${v.id}`}>
                            <TierBadge tier={v.tier} className={css.tier} />
                            <div className={css.texts}>
                                <span className={css.title}>{v.name}</span>
                                <span className={css.tags}>{v.description} | 태그: {v.tags.map(TAG_TO_STRING).join(", ")}</span>
                            </div>
                            <FontAwesomeIcon className={css.icon} icon={faChevronRight} />
                        </Link>) :
                    <div className={css.empty}>
                        <span className={css.title}>아무 문제도 없네요...</span>
                    </div>
                }
            </div>
        </div>
    </>;
}
