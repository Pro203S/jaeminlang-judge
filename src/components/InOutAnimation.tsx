import { animated, easings, useSpringValue } from "@react-spring/web";
import React, { useEffect } from "react"

type Props = {
    animate: boolean,
    children: React.ReactNode;
    className?: string;
    delay?: number;

    onAnimateEnd?: () => void;
}

export default function InOutAnimation(props: Props) {
    const { animate, children, className, delay, onAnimateEnd } = props;

    const opacity = useSpringValue(0, {
        "config": {
            "duration": 480,
            "easing": easings.easeOutCubic
        }
    });
    const translateY = useSpringValue(15, {
        "config": {
            "duration": 480,
            "easing": easings.easeOutBack
        }
    });

    useEffect(() => {
        let isCancelled = false;

        const runAnimation = async () => {
            const animationDelay = delay ?? 0;

            if (animationDelay > 0) {
                await new Promise((resolve) => setTimeout(resolve, animationDelay));
            }

            if (isCancelled) return;

            await Promise.all([
                opacity.start(animate ? 1 : 0),
                translateY.start(animate ? 0 : 10)
            ]);

            if (!isCancelled) {
                onAnimateEnd?.();
            }
        };

        void runAnimation();

        return () => {
            isCancelled = true;
            opacity.stop();
            translateY.stop();
        };
    }, [animate, delay, onAnimateEnd, opacity, translateY]);

    return <animated.div className={className} style={{
        opacity,
        "transform": translateY.to(v => `translateY(${v}px)`)
    }}>
        {children}
    </animated.div>
}
