import Snapshot from './Snapshot';

export default interface ErrorReport {
    reportedBy: 'Logger' | 'MediaBrowser' | 'BSOD';
    reportingId: string; // id of logger or `MediaSource` id
    error: {
        message: string;
        httpStatus?: number;
        httpStatusText?: string;
        stack: string[];
    } | null;
    snapshot: Snapshot;
}
