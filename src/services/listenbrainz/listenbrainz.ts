import SimplePager from 'services/SimplePager';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import listenbrainzApi from './listenbrainzApi';
import {observeIsLoggedIn, login, logout} from './listenbrainzAuth';
import settings from './listenbrainzSettings';

console.log('module::listenbrainz');

async function test() {
    const result = await listenbrainzApi.get(`/1/stats/user/${settings.userId}/recordings`);
    console.log({result});
}

const recentlyPlayed: MediaSource<MediaItem> = {
    id: 'listenbrainz/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,

    search(): Pager<MediaItem> {
        test();
        return new SimplePager();
    },
};

const listenbrainz: MediaService = {
    id: 'listenbrainz',
    title: 'ListenBrainz',
    icon: 'listenbrainz',
    sources: [recentlyPlayed],
    searches: [],

    observeIsLoggedIn,
    login,
    logout,
};

export default listenbrainz;
