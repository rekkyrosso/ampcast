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

export async function getContentType(url: string): Promise<string> {
    const response = await fetch(url, {method: 'HEAD'});
    return response.headers.get('Content-Type') || '';
}

export function chunk<T>(values: readonly T[], chunkSize = 1): T[][] {
    if (chunkSize <= 0) {
        return [];
    }
    const chunks: T[][] = [];
    const rest = [...values];
    while (rest.length) {
        chunks.push(rest.splice(0, chunkSize));
    }
    return chunks;
}

export function groupBy<T, K extends keyof any>(
    values: readonly T[],
    criteria: K | ((value: T) => K)
): Record<K, readonly T[]> {
    const getKey: (value: T) => K =
        typeof criteria === 'function'
            ? criteria
            : (value: T) => value[criteria as unknown as keyof T] as K;
    return values.reduce((groups, value) => {
        const key = getKey(value);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(value);
        return groups;
    }, {} as Record<K, T[]>);
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
    return [...new Set(values)];
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
    return new Date(Math.floor((seconds || 0) * 1000))
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
    values: T[],
    predicate: (value: T, index: number, array: readonly T[]) => unknown,
    thisArg?: any
): T[] {
    const newValues = values.filter(predicate, thisArg);
    return newValues.length === 0 ? values.slice() : newValues;
}

export function fuzzyCompare(a: string, b: string, tolerance = 0.9): boolean {
    return Math.max(stringScore(a, b, 0.99), stringScore(b, a, 0.99)) >= tolerance;
}

export function getTextFromHtml(html = ''): string {
    const element = document.createElement('p');
    const paragraphs = String(html ?? '')
        .trim()
        .split(/[\n\r]+/);
    return paragraphs
        ?.map((html) => {
            element.innerHTML = html;
            return element.textContent;
        })
        .join('\n');
}

export function saveTextToFile(fileName: string, text: string, type = 'text/json'): void {
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(new Blob([text], {type}));
    link.download = fileName;
    link.type = type;
    link.click();
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
