export function getElapsedTimeText(date: number | string | Date): string {
    const elapsedTime = Date.now() - new Date(date).valueOf();
    const minute = 60_000;
    if (elapsedTime < minute * 2) {
        return 'just now';
    }
    const hour = 60 * minute;
    if (elapsedTime < hour * 1.5) {
        return `${Math.round(elapsedTime / minute)} mins ago`;
    }
    const day = 24 * hour;
    if (elapsedTime < day * 1.5) {
        return `${Math.round(elapsedTime / hour)} hours ago`;
    }
    if (elapsedTime < day * 12) {
        return `${Math.round(elapsedTime / day)} days ago`;
    }
    const week = 7 * day;
    if (elapsedTime < week * 10) {
        return `${Math.round(elapsedTime / week)} weeks ago`;
    }
    const month = 30 * day;
    const year = 365 * day;
    if (elapsedTime < year) {
        return `${Math.round(elapsedTime / month)} months ago`;
    }
    if (elapsedTime < 2 * year) {
        return `1 year ago`;
    }
    return `${Math.floor(elapsedTime / year)} years ago`;
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

export function parseISO8601(value: string): number {
    const pattern = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const [, hours = 0, minutes = 0, seconds = 0] = pattern.exec(value) || [];
    return Number(hours) * 60 * 60 + Number(minutes) * 60 + Number(seconds) || 0;
}
