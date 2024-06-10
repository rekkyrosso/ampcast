import type {Observable} from 'rxjs';
import {Subscription, mergeMap} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import Pager, {Page} from 'types/Pager';
import SequentialPager from 'services/pagers/SequentialPager';
import listenbrainzApi from './listenbrainzApi';
import {Logger} from 'utils';

const logger = new Logger('ListenBrainzPlaylistItemsPager');

export default class ListenBrainzPlaylistItemsPager implements Pager<MediaItem> {
    private readonly pager: SequentialPager<MediaItem>;
    private subscriptions?: Subscription;

    constructor(playlist_mbid: string) {
        const pageSize = 100;
        let offset = 0;
        this.pager = new SequentialPager<MediaItem>(
            async (count = pageSize): Promise<Page<MediaItem>> => {
                const {playlist} = await listenbrainzApi.get<ListenBrainz.PlaylistItemsResponse>(
                    `playlist/${playlist_mbid}`,
                    {offset, count},
                    true
                );
                offset += count;
                const items = playlist.track.map((track) => this.createMediaItem(track));
                return {items, total: items.length, atEnd: true};
            },
            {pageSize}
        );
    }

    get maxSize(): number | undefined {
        return this.pager.maxSize;
    }

    observeItems(): Observable<readonly MediaItem[]> {
        return this.pager.observeItems();
    }

    observeSize(): Observable<number> {
        return this.pager.observeSize();
    }

    observeError(): Observable<unknown> {
        return this.pager.observeError();
    }

    disconnect(): void {
        this.pager.disconnect();
        this.subscriptions?.unsubscribe();
    }

    fetchAt(index: number, length: number): void {
        if (!this.subscriptions) {
            this.connect();
        }

        this.pager.fetchAt(index, length);
    }

    private connect(): void {
        if (!this.subscriptions) {
            this.subscriptions = new Subscription();

            this.subscriptions.add(
                this.pager
                    .observeAdditions()
                    .pipe(mergeMap((items) => listenbrainzApi.addUserData(items)))
                    .subscribe(logger)
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
            artists: metadata?.artists
                ? metadata.artists.map((artist) => artist.artist_credit_name)
                : item.creator
                ? [item.creator]
                : undefined,
            duration: 0,
            recording_mbid: mbid,
            release_mbid: track?.additional_metadata?.caa_release_mbid,
            artist_mbids: metadata?.artists
                ? metadata.artists.map((artist) => artist.artist_mbid)
                : track?.artist_identifiers?.map((identifier) => identifier.split('/').pop()!),
            playedAt: 0,
        };
    }
}
