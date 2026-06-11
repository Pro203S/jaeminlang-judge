"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useEffect, useRef, useState } from "react";
import REST from "@/modules/rest";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faSearch } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/button";
import Dropdown from "@/components/dropdown";
import { animated, easings, useSpringValue } from "@react-spring/web";

const AnimatedFA = animated(FontAwesomeIcon);

export default function Page() {
    const [user, setUser] = useState<APIUser>();
    const searchBox = useRef<HTMLInputElement>(null);
    const searchButton = useRef<HTMLButtonElement>(null);

    const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
    const [selectedTag, setSelectedTag] = useState("태그");

    const tagArrowRotation = useSpringValue(0, {
        "config": {
            "duration": 250,
            "easing": easings.easeOutCubic
        }
    });

    useEffect(() => {
        (async () => {
            const r = await REST("/api/me");
            if (!r.success) return;

            setUser(r.data);
        })();
    }, []);

    useEffect(() => { tagArrowRotation.start(tagDropdownOpen ? -180 : 0) }, [tagDropdownOpen]);

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
                        label="문제 태그 선택"
                        items={[
                            
                        ]}
                    >
                        <span>{selectedTag}</span>
                        <AnimatedFA icon={faChevronDown} style={{ "transform": tagArrowRotation.to(v => `rotate(${v}deg)`) }} />
                    </Dropdown>
                </div>
            </div>
            <div className={css.problems}>

            </div>
        </div>
    </>;
}
