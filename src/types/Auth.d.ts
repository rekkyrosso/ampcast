import type {Observable} from 'rxjs';

export default interface Auth {
    observeIsLoggedIn(this: unknown): Observable<boolean>;
    isConnected(this: unknown): boolean;
    isLoggedIn(this: unknown): boolean;
    login(this: unknown): Promise<void>;
    logout(this: unknown): Promise<void>;
    // Everything below here should be optional.
    noAuth?: boolean;
    observeConnecting?(this: unknown): Observable<boolean>;
    observeConnectionLogging?(this: unknown): Observable<string>;
    reconnect?(this: unknown): void;
}
