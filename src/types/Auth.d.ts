import type {Observable} from 'rxjs';

export default interface Auth {
    observeIsLoggedIn(): Observable<boolean>;
    isLoggedIn(): boolean;
    login(): Promise<void>;
    logout(): Promise<void>;
}
