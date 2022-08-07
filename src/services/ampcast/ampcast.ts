import {of} from 'rxjs';
import MediaService from 'types/MediaService';

console.log('module::ampcast');

const ampcast: MediaService = {
    id: 'ampcast',
    title: 'Ampcast',
    icon: 'file',
    sources: [],
    searches: [],

    observeIsLoggedIn: () => of(true),
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
};

export default ampcast;
