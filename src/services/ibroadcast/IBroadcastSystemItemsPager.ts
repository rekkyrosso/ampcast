import type {Observable} from 'rxjs';
import {filter} from 'rxjs';
import MediaItem from 'types/MediaItem';
import IBroadcastPager from './IBroadcastPager';
import ibroadcastLibrary, {IBroadcastLibraryChange} from './ibroadcastLibrary';

export default class IBroadcastSystemItemsPager extends IBroadcastPager<MediaItem> {
    constructor(playlistType: iBroadcast.SystemPlaylistType) {
        super(
            'tracks',
            async () => {
                const library = await ibroadcastLibrary.load();
                const id = this.getPlaylistId(library, playlistType);
                const playlists = library.playlists;
                const playlist = playlists[id];
                const map = playlists.map;
                const trackIds: number[] | undefined = playlist?.[map.tracks];
                if (!trackIds) {
                    throw Error('Tracks not found');
                }
                return trackIds;
            },
            undefined,
            undefined,
            () => this.observeChanges(playlistType)
        );
    }

    private observeChanges(
        playlistType: iBroadcast.SystemPlaylistType
    ): Observable<IBroadcastLibraryChange<'playlists'>> {
        return ibroadcastLibrary.observeChanges('playlists').pipe(
            filter((change) => {
                if (change.type === 'data' && change.fields.includes('tracks')) {
                    return change.id === this.getPlaylistId(change.library, playlistType);
                } else {
                    return false;
                }
            })
        );
    }

    private getPlaylistId(
        library: iBroadcast.Library,
        playlistType: iBroadcast.SystemPlaylistType
    ): number {
        const playlists = library.playlists;
        const type = playlists.map.type;
        const id = Object.keys(playlists).find((id) => playlists[id][type] === playlistType);
        return Number(id);
    }
}
