"use client";

import Link from "next/link";
import {
    CSSProperties,
    Dispatch,
    KeyboardEvent,
    MouseEvent,
    ReactNode,
    SetStateAction,
    useEffect,
    useId,
    useRef
} from "react";
import css from "./style.module.css";
import InOutAnimation from "../InOutAnimation";

type DropdownItemBase = {
    "label"?: ReactNode;
    "className"?: string;
};

type DropdownItemButton = DropdownItemBase & {
    "type": "button";
    "onClick": () => any;
    "disabled"?: boolean;
};

type DropdownItemLink = DropdownItemBase & {
    "type": "link";
    "href": string;
    "target"?: string;
};

type DropdownItemLine = {
    "type": "line";
};

type DropdownItem = DropdownItemButton | DropdownItemLink | DropdownItemLine;

type Props = {
    "children": ReactNode;
    "open": boolean;
    "setOpen": Dispatch<SetStateAction<boolean>>;
    "items": DropdownItem[];
    "containerStyle"?: CSSProperties;
    "className"?: string;
    "menuClassName"?: string;
    "menuStyle"?: CSSProperties;
    "label"?: string;
};

export default function Dropdown(props: Props) {
    const {
        children,
        open,
        setOpen,
        items,
        containerStyle,
        className,
        menuClassName,
        menuStyle,
        label
    } = props;
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    useEffect(() => {
        if (!open) return;

        const closeDropdown = (ev: MouseEvent | globalThis.MouseEvent) => {
            if (
                ev.target instanceof Node &&
                dropdownRef.current?.contains(ev.target)
            ) {
                return;
            }

            setOpen(false);
        };

        const closeOnEscape = (ev: globalThis.KeyboardEvent) => {
            if (ev.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", closeDropdown);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("mousedown", closeDropdown);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [open, setOpen]);

    const handleTriggerClick = () => {
        setOpen((value) => !value);
    };

    const handleTriggerKeyDown = (ev: KeyboardEvent<HTMLButtonElement>) => {
        if (ev.key === "ArrowDown" || ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            setOpen(true);
        }
    };

    const closeAfterAction = () => {
        setOpen(false);
    };

    return <div
        ref={dropdownRef}
        style={containerStyle}
        className={`${css.container} ${className ?? ""}`.trim()}
    >
        <button
            className={css.trigger}
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={label}
            onClick={handleTriggerClick}
            onKeyDown={handleTriggerKeyDown}
        >
            {children}
        </button>
        <InOutAnimation
            animate={open}
            id={menuId}
            role="menu"
            className={`${css.dropdown} ${menuClassName ?? ""}`.trim()}
            style={menuStyle}
        >
            {items.map((item, index) => {
                if (item.type === "line") {
                    return <div
                        key={`line-${index}`}
                        className={css.separator}
                        role="separator"
                    />;
                }

                const sharedClassName = `${css.item} ${item.className ?? ""}`.trim();

                if (item.type === "link") {
                    return <Link
                        key={`link-${index}-${item.href}`}
                        href={item.href}
                        target={item.target}
                        className={sharedClassName}
                        role="menuitem"
                        onClick={closeAfterAction}
                    >
                        {item.label}
                    </Link>;
                }

                return <button
                    key={`button-${index}`}
                    type="button"
                    className={sharedClassName}
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={(ev: MouseEvent<HTMLButtonElement>) => {
                        ev.preventDefault();
                        item.onClick();
                        closeAfterAction();
                    }}
                >
                    {item.label}
                </button>;
            })}
        </InOutAnimation>
    </div>;
}
