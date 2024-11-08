import Snapshot from './Snapshot';

export default interface ErrorReport {
    readonly reportedBy: string;
    readonly reportingId: string; // id of logger or `MediaSource` id
    readonly error: {
        readonly message: string;
        readonly httpStatus?: number;
        readonly httpStatusText?: string;
        readonly stack: string[];
    } | null;
    readonly snapshot: Snapshot;
}
