import type {Observer} from 'rxjs';

type AnyObserver = Partial<Observer<any>>;
type BasicConsole = Pick<Console, 'info' | 'log' | 'warn' | 'error'>;

const startedAt = performance.now();

if (__dev__) {
    console.log('# Logger:', 'startedAt', startedAt);
}

export default class Logger implements BasicConsole, AnyObserver {
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

    constructor(id = '', rx = false, console: BasicConsole = window.console) {
        const prefix = id ? ` ${id}:` : '';

        const createId = (oldId: string, newId?: string) =>
            oldId && newId ? `${oldId}/${newId}` : newId || oldId;

        const log = (...args: any[]) => {
            if (id.startsWith(Logger.only)) {
                console.log(...args);
            }
        };

        // Basic console.
        this.info = (...args: any[]) => log(`#${prefix}`, ...args);
        this.log = (...args: any[]) => log(`##${prefix}`, ...args);
        this.warn = (...args: any[]) => log(`###${prefix}`, ...args);
        this.error = (err: unknown) => {
            if (id.startsWith(Logger.only)) {
                log(`####${prefix} ERROR`);
                console.error(err);
            }
        };

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
