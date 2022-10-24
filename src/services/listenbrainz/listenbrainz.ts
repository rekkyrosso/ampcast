import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import {observeIsLoggedIn, login, logout} from './listenbrainzAuth';
import ListenBrainzHistoryPager from './ListenBrainzHistoryPager';
import './listenbrainzScrobbler';

console.log('module::listenbrainz');

const recentTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
};

const listenbrainzHistory: MediaSource<MediaItem> = {
    id: 'listenbrainz/history',
    title: 'History',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: recentTracksLayout,

    search(): Pager<MediaItem> {
        return new ListenBrainzHistoryPager();
    },
};

const listenbrainz: MediaService = {
    id: 'listenbrainz',
    title: 'ListenBrainz',
    icon: 'listenbrainz',
    url: 'https://listenbrainz.org/',
    scrobbler: true,
    sources: [],
    searches: [listenbrainzHistory],

    observeIsLoggedIn,
    login,
    logout,
};

export default listenbrainz;
