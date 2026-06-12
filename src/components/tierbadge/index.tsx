import { CSSProperties } from 'react';
import css from './style.module.css';
import { TierToString } from '@/modules/tier';

type Props = {
    "tier": Tier,
    "style"?: CSSProperties,
    "className"?: string,
};

const TIER_COLOR_MAP = {
    "bronze": {
        "bg": "#aa5b00",
        "fg": "#fff"
    },
    "silver": {
        "bg": "#505050",
        "fg": "#fff"
    },
    "gold": {
        "bg": "#ffe057",
        "fg": "#000"
    },
    "platinum": {
        "bg": "linear-gradient(242deg, #757575, #ffffff)",
        "fg": "#000"
    },
    "diamond": {
        "bg": "#7ee5ff",
        "fg": "#000"
    },
    "god": {
        "bg": "linear-gradient(360deg, #000, #fff)",
        "fg": "#1e1e1e"
    },
};

export default function TierBadge(props: Props) {
    const { tier, style, className } = props;

    return <div className={className + " " + css.badge} style={style}>
        <div className={css.icon} style={{ "background": TIER_COLOR_MAP[tier.category].bg }}>
            <span style={{ "color": TIER_COLOR_MAP[tier.category].fg }}>{TierToString(tier).split(" ")[1]}</span>
        </div>
    </div>;
}