"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useEffect, useRef, useState } from "react";
import REST from "@/modules/rest";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faSearch } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/button";
import Dropdown, { DropdownItem } from "@/components/dropdown";
import { animated, easings, useSpringValue } from "@react-spring/web";
import { AVAILABLE_TAGS } from "@/modules/constants";
import { AVAILABLE_TIERS, TierToString } from "@/modules/tier";

const AnimatedFA = animated(FontAwesomeIcon);

export default function Page() {
    const [user, setUser] = useState<APIUser>();
    const [problems, setProblems] = useState<APIProblem[]>([]);
    const searchBox = useRef<HTMLInputElement>(null);
    const searchButton = useRef<HTMLButtonElement>(null);

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
        })();
    }, []);

    return <>
        <Header sessionOverride={user} doNotRequest />
        <div className={css.container}>
            <div className={css.search}>
                <div className={css.linearV}>
                    <input
                        type="text"
                        className={css.searchBox}
                        onKeyDown={(ev) => (ev.key === "Enter" && searchButton.current) && searchButton.current.click()}
                        placeholder="문제 이름으로 검색..."
                        ref={searchBox}
                    />
                    <Button
                        className={css.searchButton}
                        ref={searchButton}
                        onClick={async () => {
                            if (!searchBox.current) {
                                window.location.reload();
                                return;
                            }

                            const { value } = searchBox.current;

                            console.log(value);
                        }}
                    >
                        <FontAwesomeIcon icon={faSearch} />
                    </Button>
                </div>
                <div className={css.linearV}>
                    <Dropdown
                        open={tagDropdownOpen}
                        setOpen={setTagDropdownOpen}
                        label="태그 선택"
                        items={[
                            {
                                "onClick": () => setSelectedTag(""),
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

            </div>
        </div>
    </>;
}
