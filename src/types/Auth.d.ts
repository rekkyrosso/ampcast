import type {Observable} from 'rxjs';

export default interface Auth {
    observeIsLoggedIn(this: unknown): Observable<boolean>;
    isLoggedIn(this: unknown): boolean;
    login(this: unknown): Promise<void>;
    logout(this: unknown): Promise<void>;
}
