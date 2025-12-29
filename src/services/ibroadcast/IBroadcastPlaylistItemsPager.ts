import MediaItem from 'types/MediaItem';
import {PagerConfig} from 'types/Pager';
import SortParams from 'types/SortParams';
import IBroadcastPager from './IBroadcastPager';
import ibroadcastLibrary from './ibroadcastLibrary';
import {createMediaItem, sortTracks} from './ibroadcastUtils';

export default class IBroadcastPlaylistItemsPager extends IBroadcastPager<MediaItem> {
    private readonly positions: Record<number, number> = {};

    constructor(
        playlistId: number,
        itemSort?: SortParams,
        options?: Partial<PagerConfig<MediaItem>>
    ) {
        super(
            'tracks',
            async () => {
                const library = await ibroadcastLibrary.load();
                const playlists = library.playlists;
                const playlist = playlists[playlistId];
                const map = playlists.map;
                const trackIds: number[] | undefined = playlist?.[map.tracks];
                if (!trackIds) {
                    throw Error('Tracks not found');
                }
                trackIds.forEach((trackId, index) => (this.positions[trackId] = index + 1));
                if (itemSort) {
                    const {sortBy, sortOrder} = itemSort;
                    if (sortBy === 'position') {
                        return sortOrder === -1 ? trackIds.toReversed() : trackIds;
                    }
                    const tracks = library.tracks;
                    const map = tracks.map;
                    return trackIds.toSorted((a, b) =>
                        sortTracks(sortBy, sortOrder, tracks[a], tracks[b], map, library)
                    );
                } else {
                    return trackIds;
                }
            },
            options
        );
    }

    protected createItem(library: iBroadcast.Library, trackId: number): MediaItem {
        return createMediaItem(trackId, library, this.positions[trackId]);
    }
}
