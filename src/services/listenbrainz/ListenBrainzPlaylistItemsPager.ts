import {mergeMap} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import {Page} from 'types/Pager';
import {Logger} from 'utils';
import SequentialPager from 'services/pagers/SequentialPager';
import listenbrainzApi from './listenbrainzApi';

const logger = new Logger('ListenBrainzPlaylistItemsPager');

export default class ListenBrainzPlaylistItemsPager extends SequentialPager<MediaItem> {
    constructor(playlist_mbid: string) {
        let offset = 0;
        super(
            async (count: number): Promise<Page<MediaItem>> => {
                const {playlist} = await listenbrainzApi.get<ListenBrainz.PlaylistItemsResponse>(
                    `playlist/${playlist_mbid}`,
                    {offset, count},
                    true
                );
                offset += count;
                const items = playlist.track.map((track) => this.createMediaItem(track));
                return {items, total: items.length, atEnd: true};
            },
            {pageSize: 100}
        );
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            this.subscribeTo(
                this.observeAdditions().pipe(
                    mergeMap((items) => listenbrainzApi.addUserData(items))
                ),
                logger
            );
        }
    }

    private createMediaItem(item: ListenBrainz.PlaylistItem): MediaItem {
        const mbid = item.identifier[0].split('/').pop()!;
        const track = item.extension?.['https://musicbrainz.org/doc/jspf#track'];
        const metadata = track?.['additional_metadata'];
        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `listenbrainz:track:${mbid}`,
            externalUrl: item.identifier,
            title: item.title,
            album: item.album,
            artists: metadata?.artists
                ? metadata.artists.map((artist) => artist.artist_credit_name)
                : item.creator
                ? [item.creator]
                : undefined,
            duration: 0,
            recording_mbid: mbid,
            artist_mbids: metadata?.artists
                ? metadata.artists.map((artist) => artist.artist_mbid)
                : track?.artist_identifiers?.map((identifier) => identifier.split('/').pop()!),
            caa_mbid: track?.additional_metadata?.caa_release_mbid,
            playedAt: 0,
        };
    }
}
