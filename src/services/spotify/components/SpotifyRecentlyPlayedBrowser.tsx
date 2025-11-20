import React, {useCallback} from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import {exists} from 'utils';
import ScrobblesBrowser from 'components/MediaBrowser/ScrobblesBrowser';
import useScrobblesPager from 'components/MediaBrowser/useScrobblesPager';
import spotifyApi, {SpotifyTrack} from '../spotifyApi';
import SpotifyPager, {SpotifyPage} from '../SpotifyPager';

export interface SpotifyRecentlyPlayedBrowserProps {
    service: MediaService;
    source: MediaSource<MediaItem>;
}

export default function SpotifyRecentlyPlayedBrowser({
    service: spotify,
    source: recentlyPlayed,
}: SpotifyRecentlyPlayedBrowserProps) {
    const createHistoryPager = useCallback(
        (from?: number, to?: number) =>
            new SpotifyPager<MediaItem>(
                async (_, limit: number): Promise<SpotifyPage> => {
                    const options: Record<string, any> = {limit};
                    if (from) {
                        options.after = from * 1000;
                    } else if (to) {
                        options.before = to * 1000;
                    }
                    const {items, total, cursors} = await spotifyApi.getMyRecentlyPlayedTracks(
                        options
                    );
                    return {
                        items: items
                            .filter(exists)
                            .map(
                                (track) =>
                                    ({played_at: track.played_at, ...track.track} as SpotifyTrack)
                            ),
                        total,
                        next: cursors?.before,
                    };
                },
                {itemKey: 'playedAt'}
            ),
        []
    );
    const {pager} = useScrobblesPager(createHistoryPager, undefined, 10_000);

    return <ScrobblesBrowser service={spotify} source={recentlyPlayed} pager={pager} />;
}
