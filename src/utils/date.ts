export function formatDate(date: number | string | Date = Date.now()): string {
    date = new Date(date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')}`;
}

export function formatMonth(date?: number | string | Date): string {
    return formatDate(date).slice(0, 7);
}

// TODO: Polymorphism (with above functions).
export function formatTime(seconds: number): string {
    return new Date(Math.floor((seconds || 0) * 1000))
        .toISOString()
        .slice(11, 19) // time portion of: YYYY-MM-DDTHH:mm:ss.sssZ
        .replace(/^[0:]+(.{4,})$/, '$1'); // remove leading zeroes
}

export function parseISO8601(value: string): number {
    const pattern = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const [, hours = 0, minutes = 0, seconds = 0] = pattern.exec(value) || [];
    return Number(hours) * 60 * 60 + Number(minutes) * 60 + Number(seconds) || 0;
}
