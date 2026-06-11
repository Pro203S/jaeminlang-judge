"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useEffect, useRef, useState } from "react";
import REST from "@/modules/rest";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/button";
import Dropdown from "@/components/dropdown";

export default function Page() {
    const [user, setUser] = useState<APIUser>();
    const searchBox = useRef<HTMLInputElement>(null);
    const searchButton = useRef<HTMLButtonElement>(null);
    
    const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
    const [selectedTag, setSelectedTag] = useState("태그");

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
                        label="문제 태그 선택"
                        items={[
                            {
                                "type": "button",
                                "label": "전체 보기",
                                "onClick": () => setSelectedTag("전체 보기")
                            },
                            {
                                "type": "line"
                            },
                            {
                                "type": "button",
                                "label": "구현",
                                "onClick": () => setSelectedTag("구현")
                            },
                            {
                                "type": "button",
                                "label": "수학",
                                "onClick": () => setSelectedTag("수학")
                            },
                            {
                                "type": "button",
                                "label": "문자열",
                                "onClick": () => setSelectedTag("문자열")
                            }
                        ]}
                    >
                        <span>{selectedTag}</span>
                    </Dropdown>
                </div>
            </div>
            <div className={css.problems}>

            </div>
        </div>
    </>;
}
