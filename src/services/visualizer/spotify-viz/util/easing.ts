/**
 * Common easing functions.
 * https://gist.github.com/gre/1650294
 */
type EasingFunction = (t: number) => number;

export const easingFunctions: Record<string, EasingFunction> = {
    linear(t: number): number {
        return t;
    },
    easeInQuad(t: number): number {
        return t * t;
    },
    easeOutQuad(t: number): number {
        return t * (2 - t);
    },
    easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    easeInCubic(t: number): number {
        return t * t * t;
    },
    easeOutCubic(t: number): number {
        return --t * t * t + 1;
    },
    easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    },
    easeInQuart(t: number): number {
        return t * t * t * t;
    },
    easeOutQuart(t: number): number {
        return 1 - --t * t * t * t;
    },
    easeInOutQuart(t: number): number {
        return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
    },
    easeInQuint(t: number): number {
        return t * t * t * t * t;
    },
    easeOutQuint(t: number): number {
        return 1 + --t * t * t * t * t;
    },
    easeInOutQuint(t: number): number {
        return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
    },
};

export default function ease(t: number, name = 'easeOutQuart'): number {
    const easingFunction = easingFunctions[name];
    if (!easingFunction) {
        throw new Error(`Unknown easing function "${name}"`);
    }
    const progress = Math.min(Math.max(0, t), 1);
    return easingFunction(progress);
}
