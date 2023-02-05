import stringScore from 'string-score';

export function exists<T>(value: T): value is NonNullable<T> {
    return value != null;
}

export async function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const loadedAttribute = 'ampcast-loaded';
        let script: HTMLScriptElement | null = document.querySelector(`script[src="${src}"]`);
        if (script?.hasAttribute(loadedAttribute)) {
            resolve();
            return;
        }
        if (!script) {
            script = document.createElement('script');
            script.async = true;
            script.src = src;
        }
        script.addEventListener('load', function () {
            this.setAttribute(loadedAttribute, '');
            resolve();
        });
        script.addEventListener('error', () => reject(`Failed to load script: '${src}'`));
        if (!script.parentElement) {
            document.head.appendChild(script);
        }
    });
}

export function partition<T>(values: readonly T[], predicate: (value: T) => boolean): [T[], T[]] {
    const trues: T[] = [];
    const falses: T[] = [];
    for (const value of values) {
        if (predicate(value)) {
            trues.push(value);
        } else {
            falses.push(value);
        }
    }
    return [trues, falses];
}

export function uniq<T>(values: readonly T[]): T[] {
    return values.filter((a, index, self) => index === self.findIndex((b) => a === b));
}

export function uniqBy<T>(values: readonly T[], key: keyof T): T[] {
    return values.filter((a, index, self) => index === self.findIndex((b) => a[key] === b[key]));
}

export function shuffle<T>(items: T[]): T[] {
    // https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array#6274398
    let counter = items.length;
    while (counter > 0) {
        const index = Math.floor(Math.random() * counter);
        counter--;
        const item = items[counter];
        items[counter] = items[index];
        items[index] = item;
    }
    return items;
}

export function formatDate(date: number | string | Date = Date.now()): string {
    date = new Date(date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')}`;
}

export function formatMonth(date?: number | string | Date): string {
    return formatDate(date).slice(0, 7);
}

export function formatTime(seconds: number): string {
    return new Date(Math.round((seconds || 0) * 1000))
        .toISOString()
        .slice(11, 19) // time portion of: YYYY-MM-DDTHH:mm:ss.sssZ
        .replace(/^[0:]+(.{4,})$/, '$1'); // remove leading zeroes
}

export function preventDefault(event: Event | React.SyntheticEvent): void {
    event.preventDefault();
}

export function stopPropagation(event: Event | React.SyntheticEvent): void {
    event.stopPropagation();
}

export function cancelEvent(event: Event | React.SyntheticEvent): void {
    event.preventDefault();
    event.stopPropagation();
}

export function getRandomValue<T>(values: readonly T[], previousValue?: T): T {
    if (values.length === 1) {
        return values[0];
    }
    if (previousValue !== undefined) {
        values = values.filter((value) => value !== previousValue);
    }
    const index = Math.floor(Math.random() * values.length);
    return values[index];
}

export function bestOf<T extends object>(a: T, b: Partial<T> = {}): T {
    const keys = uniq(Object.keys(a).concat(Object.keys(b))) as (keyof T)[];
    return keys.reduce<T>((result: T, key: keyof T) => {
        if (a[key] !== undefined) {
            result[key] = a[key];
        } else if (b[key] !== undefined) {
            result[key] = b[key]!;
        }
        return result;
    }, {} as unknown as T);
}

export function filterNotEmpty<T>(
    values: readonly T[],
    predicate: (value: T, index: number, array: readonly T[]) => unknown,
    thisArg?: any
): readonly T[] {
    const newValues = values.filter(predicate, thisArg);
    return newValues.length === 0 ? values : newValues;
}

export function fuzzyCompare(a: string, b: string, tolerance = 0.9): boolean {
    return Math.max(stringScore(a, b, 0.99), stringScore(b, a, 0.99)) >= tolerance;
}

const dummyElement = document.createElement('p');

export function getTextFromHtml(html: string): string {
    dummyElement.innerHTML = html;
    return dummyElement.textContent || '';
}