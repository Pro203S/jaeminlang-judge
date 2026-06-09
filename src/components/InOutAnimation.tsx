import { animated, easings, useSpringValue } from "@react-spring/web";
import React, { useEffect } from "react"

type Props = {
    animate: boolean,
    children: React.ReactNode;
    className?: string;
    delay?: number;

    onAnimateEnd?: () => any;
}

export default function InOutAnimation(props: Props) {
    const { animate, children, className, delay, onAnimateEnd } = props;

    const opacity = useSpringValue(0, {
        "config": {
            "duration": 480,
            "easing": easings.easeOutCubic
        },
        delay
    });
    const translateY = useSpringValue(15, {
        "config": {
            "duration": 480,
            "easing": easings.easeOutBack
        },
        delay
    });

    useEffect(() => {
        if (animate) {
            Promise.all([
                opacity.start(1),
                translateY.start(0)
            ]).then(onAnimateEnd);
        } else {
            Promise.all([
                opacity.start(0),
                translateY.start(10)
            ]).then(onAnimateEnd);
        }
    }, [animate]);

    return <animated.div className={className} style={{
        opacity,
        "transform": translateY.to(v => `translateY(${v}px)`)
    }}>
        {children}
    </animated.div>
}