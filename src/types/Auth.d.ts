import type {Observable} from 'rxjs';

export default interface Auth {
    observeConnectionStatus?(this: unknown): Observable<string>;
    observeIsLoggedIn(this: unknown): Observable<boolean>;
    isConnected(this: unknown): boolean;
    isLoggedIn(this: unknown): boolean;
    login(this: unknown): Promise<void>;
    logout(this: unknown): Promise<void>;
}
