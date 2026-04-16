import ErrorReport from './ErrorReport';
import LogLevel from './LogLevel';

export default interface Log {
    readonly id: string;
    readonly timeStamp: number;
    readonly level: LogLevel;
    readonly message: string;
    readonly errorReport?: ErrorReport;
    readonly repeats?: number;
}

export type ReadableLog = Pick<Log, 'timeStamp' | 'errorReport' | 'repeats'> &
    (
        | {
              info: string;
          }
        | {
              log: string;
          }
        | {
              Warn: string;
          }
        | {
              ERROR: string;
          }
    );
