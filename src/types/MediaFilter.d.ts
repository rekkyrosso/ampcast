export default interface MediaFilter {
    readonly id: string;
    readonly title: string;
    readonly count?: number;
    readonly q?: string;
}
