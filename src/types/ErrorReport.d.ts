export default interface ErrorReport {
    readonly reportedBy: string;
    readonly reportingId: string; // id of logger or `MediaSource` id
    readonly error: {
        readonly message: string;
        readonly response?: {
            readonly status: number;
            readonly statusText: string;
        };
        readonly stack?: string[];
    };
}
