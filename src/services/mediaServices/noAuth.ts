import {of} from 'rxjs';
import Auth from 'types/Auth';

export default function noAuth(isLoggedIn: boolean): Auth {
    return {
        observeIsLoggedIn: () => of(isLoggedIn),
        isConnected: () => isLoggedIn,
        isLoggedIn: () => isLoggedIn,
        login: () => Promise.resolve(),
        logout: () => Promise.resolve(),
    };
}
