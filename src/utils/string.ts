import stringScore from 'string-score';

export function fuzzyCompare(a: string, b: string, tolerance = 0.9): boolean {
    return Math.max(stringScore(a, b, 0.99), stringScore(b, a, 0.99)) >= tolerance;
}

export function stringContainsMusic(text: string): boolean {
    return /m[uú][sz](i|ie)[ckq]/i.test(text);
}
