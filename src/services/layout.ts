// TODO: Improve.

export default {
    get(id: string, defaultValue = 0): number {
        const value = localStorage.getItem(`layout/${id}`);
        return Number(value) || defaultValue;
    },

    set(id: string, value: number): void {
        localStorage.setItem(`layout/${id}`, String(Number(value) || 0));
    },
};
