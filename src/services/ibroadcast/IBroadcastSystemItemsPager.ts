import MediaItem from 'types/MediaItem';
import IBroadcastPager from './IBroadcastPager';
import ibroadcastLibrary from './ibroadcastLibrary';
import {getSystemPlaylistId} from './ibroadcastUtils';

export default class IBroadcastSystemItemsPager extends IBroadcastPager<MediaItem> {
    constructor(playlistType: iBroadcast.SystemPlaylistType) {
        super(
            'tracks',
            async () => {
                const library = await ibroadcastLibrary.load();
                const id = getSystemPlaylistId(library, playlistType);
                const playlists = library.playlists;
                const playlist = playlists[id];
                const map = playlists.map;
                return playlist?.[map.tracks] || [];
            },
            undefined,
            undefined,
            () => ibroadcastLibrary.observeSystemPlaylistChanges(playlistType)
        );
    }
}
