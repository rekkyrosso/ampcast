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

export function filterNotEmpty<T>(
    values: T[],
    predicate: (value: T, index: number, array: readonly T[]) => unknown
): T[] {
    const newValues = values.filter(predicate);
    return newValues.length === 0 ? values.slice() : newValues;
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

export function groupBy<T, K extends keyof any>(
    values: readonly T[],
    criteria: K | ((value: T) => K)
): Record<K, readonly T[]> {
    const getKey: (value: T) => K =
        typeof criteria === 'function'
            ? criteria
            : (value: T) => value[criteria as unknown as keyof T] as K; // TypeScript master ;)
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
    const truthy: T[] = [];
    const falsy: T[] = [];
    for (const value of values) {
        if (predicate(value)) {
            truthy.push(value);
        } else {
            falsy.push(value);
        }
    }
    return [truthy, falsy];
}

export function shuffle<T>(values: T[]): T[] {
    // https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array#6274398
    const shuffled = values.slice();
    let counter = shuffled.length;
    while (counter > 0) {
        const index = Math.floor(Math.random() * counter);
        counter--;
        const value = shuffled[counter];
        shuffled[counter] = shuffled[index];
        shuffled[index] = value;
    }
    return shuffled;
}

export function uniq<T>(values: readonly T[]): T[] {
    return [...new Set(values)];
}

export function uniqBy<T>(values: readonly T[], key: keyof T): T[] {
    return values.filter((a, index, self) => index === self.findIndex((b) => a[key] === b[key]));
}
