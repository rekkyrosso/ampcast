import stringScore from 'string-score';

export function decode(value: string): string {
    try {
        if (value) {
            const values = value.split(',').map(Number);
            if (values.some(isNaN)) {
                throw Error('Invalid encoding');
            }
            return new TextDecoder().decode(Uint8Array.from(values));
        }
    } catch (err) {
        console.error(err);
    }
    return '';
}

export function fuzzyCompare(a: string, b: string, tolerance = 0.9): boolean {
    return Math.max(stringScore(a, b, 0.99), stringScore(b, a, 0.99)) >= tolerance;
}

export function stringContainsMusic(text: string): boolean {
    return /m[uú][sz](i|ie)[ckq]/i.test(text);
}

export function toUtf8(text: string): string {
    // https://stackoverflow.com/questions/5396560/how-do-i-convert-special-utf-8-chars-to-their-iso-8859-1-equivalent-using-javasc
    // This does an okay job of converting iso text to utf8.
    try {
        return decodeURIComponent(escape(text));
    } catch {
        return text;
    }
}
