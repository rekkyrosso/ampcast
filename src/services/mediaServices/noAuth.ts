import {of} from 'rxjs';
import Auth from 'types/Auth';

const noAuth: Auth = {
    observeIsLoggedIn: () => of(false),
    isConnected: () => false,
    isLoggedIn: () => false,
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
};

export default noAuth;
