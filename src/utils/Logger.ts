import type {Observer} from 'rxjs';

type AnyObserver = Partial<Observer<any>>;
type BasicConsole = Pick<Console, 'log' | 'warn' | 'error'>;

console.log('module:Logger');

export default class Logger implements BasicConsole, AnyObserver {
    private static only?: Logger;
    #id = '';
    #rx = false;

    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (err: unknown) => void;
    next?: (...args: any[]) => void;
    complete?: () => void;

    constructor(id = '', rx = false, private readonly console: BasicConsole = window.console) {
        this.#id = String(id);
        this.#rx = __dev__ && rx;
        this.log = this._log.bind(this, 1);
        this.warn = this._log.bind(this, 2);
        this.error = this._error.bind(this);
        if (this.#rx) {
            this.next = this.log;
            this.complete = this._log.bind(this, 1, '***complete***');
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

    private _log(level: 1 | 2 | 3, ...args: any[]): void {
        if (this._canLog) {
            this.console.log(
                `${'####'.slice(3 - level)}${this.#id ? ` ${this.#id}:` : ''}`,
                ...args
            );
        }
    }

    _error(err: unknown): void {
        if (this._canLog) {
            this._log(3, 'ERROR');
            this.console.error(err);
        }
    }
}
