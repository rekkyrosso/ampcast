import type {Observable, Observer} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import ErrorReport from 'types/ErrorReport';

type AnyObserver = Partial<Observer<any>>;
type BasicConsole = Pick<Console, 'info' | 'log' | 'warn' | 'error'>;

const startedAt = performance.now();

if (__dev__) {
    console.log('# Logger:', 'startedAt', startedAt);
}

export const enum LogLevel {
    Info = 1,
    Log = 2,
    Warn = 3,
    Error = 4,
}

export interface Log {
    readonly id: string;
    readonly timeStamp: number;
    readonly level: LogLevel;
    readonly message: string;
    readonly errorReport?: ErrorReport;
    readonly repeats?: number;
}

const logs$ = new BehaviorSubject<readonly Log[]>([]);

const logLimit = 500;
let logCount = 0;

function observeLogs(): Observable<readonly Log[]> {
    return logs$;
}

function addLog(level: LogLevel, args: any[], loggerId: string): void {
    const logs = logs$.value.slice();
    const prevLog: Log | undefined = logs[0];
    let log = createLog(level, args, loggerId);
    if (log.level === prevLog?.level && log.message === prevLog.message) {
        if (prevLog.repeats) {
            logs[0] = {...log, repeats: prevLog.repeats + 1, timeStamp: Date.now()};
            logs$.next(logs);
            return;
        } else {
            log = {...log, repeats: 1};
        }
    }
    logs.unshift(log);
    logs.length = Math.min(logs.length, logLimit);
    logs$.next(logs);
}

function createLog(level: LogLevel, args: any[], loggerId: string): Log {
    const id = String(logCount++);
    const timeStamp = performance.now();
    const message = `${loggerId}: ${args.join(' ')}`;
    const log = {id, timeStamp, level, message};
    if (level === 4) {
        const errorReport = Logger.createErrorReport?.(args[0], 'Logger', loggerId);
        console.log({errorReport});
        return {...log, errorReport};
    } else {
        return log;
    }
}

export default class Logger implements BasicConsole, AnyObserver {
    static readonly startedAt = Date.now();
    static createErrorReport?: (
        error: any,
        reportedBy: ErrorReport['reportedBy'],
        loggerId?: string
    ) => ErrorReport;
    private static only = '';
    readonly info: BasicConsole['info'];
    readonly log: BasicConsole['log'];
    readonly warn: BasicConsole['warn'];
    readonly error: BasicConsole['error'];
    readonly id: (id: string) => Logger;
    readonly rx: (id?: string) => Logger;
    readonly next?: () => void;
    readonly complete?: () => void;
    readonly only: () => this;

    static get logs(): readonly Log[] {
        return logs$.value;
    }

    static readonly observeLogs: (this: unknown) => Observable<readonly Log[]> = observeLogs;

    constructor(id = '', rx = false, console: BasicConsole = window.console) {
        const createId = (oldId: string, newId?: string) =>
            oldId && newId ? `${oldId}/${newId}` : newId || oldId;

        const log = (level: LogLevel, args: any[]) => {
            if (id.startsWith(Logger.only)) {
                const hash = Array(level).fill('#').join('');
                const prefix = id ? ` ${id}:` : '';
                if (level === 4) {
                    console.log(`${hash}${prefix}`, 'ERROR');
                    console.error(...args);
                } else {
                    console.log(`${hash}${prefix}`, ...args);
                }
                if (id) {
                    addLog(level, args, id);
                }
            }
        };

        // Basic console.
        this.info = (...args: any[]) => log(1, args);
        this.log = (...args: any[]) => log(2, args);
        this.warn = (...args: any[]) => log(3, args);
        this.error = (...args: any[]) => log(4, args);

        // For RxJS debugging.
        if (rx) {
            this.next = this.info;
            this.complete = () => this.info('***complete***');
        }

        // For cloning.
        this.id = (newId: string) => new Logger(createId(id, newId), rx, console);
        this.rx = (newId?: string) => new Logger(createId(id, newId), true, console);

        // For less noise.
        this.only = () => {
            if (__dev__) {
                Logger.only = id;
            }
            return this;
        };

        // For more noise.
        // if (__dev__ && id && !rx) {
        //     this.info('createdAt', performance.now() - startedAt);
        // }
    }
}
