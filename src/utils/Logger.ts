import type {Observer} from 'rxjs';

type AnyObserver = Partial<Observer<any>>;
type BasicConsole = Pick<Console, 'log' | 'warn' | 'error'>;

console.log('module:Logger');

export default class Logger implements BasicConsole, AnyObserver {
    private static only?: Logger;
    #id = '';
    #rx = false;

    next?: (...args: any[]) => void;
    complete?: () => void;

    constructor(id = '', rx = false, private readonly console: BasicConsole = window.console) {
        this.#id = String(id);
        this.#rx = __dev__ && rx;
        if (this.#rx) {
            this.next = this.log;
            this.complete = this._complete;
        }
    }

    log(...args: any[]): void {
        this._log(1, ...args);
    }

    warn(...args: any[]): void {
        this._log(2, ...args);
    }

    error(err: unknown): void {
        if (this._canLog) {
            this._log(3, 'ERROR');
            this.console.error(err);
        }
    }

    id(id: string): Logger {
        return this._clone(id);
    }

    rx(id?: string): Logger {
        return this._clone(id, true);
    }

    only(): this {
        if (__dev__) {
            Logger.only = this;
        }
        return this;
    }

    private get _canLog(): boolean {
        return !Logger.only || Logger.only === this;
    }

    private _clone(id = '', rx = this.#rx): Logger {
        const newId = id ? `${this.#id}/${id}` : this.#id;
        return new Logger(newId, rx, this.console);
    }

    private _complete(): void {
        this.log('***complete***');
    }

    private _log(level: 1 | 2 | 3, ...args: any[]): void {
        if (this._canLog) {
            this.console.log(
                `${'####'.slice(3 - level)}${this.#id ? ` ${this.#id}:` : ''}`,
                ...args
            );
        }
    }
}
