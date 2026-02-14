import {BehaviorSubject, debounceTime, filter, map, mergeMap, switchMap, tap} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import {Page} from 'types/Pager';
import {Logger, getMediaObjectId, moveSubset, uniqBy} from 'utils';
import {dispatchMetadataChanges, observePlaylistAdditions} from 'services/metadata';
import SequentialPager from 'services/pagers/SequentialPager';
import listenbrainzApi from './listenbrainzApi';

const logger = new Logger('ListenBrainzPlaylistItemsPager');

export default class ListenBrainzPlaylistItemsPager extends SequentialPager<MediaItem> {
    private readonly synch$ = new BehaviorSubject(false);

    constructor(private readonly playlist: MediaPlaylist) {
        let offset = 0;
        super(
            async (count: number): Promise<Page<MediaItem>> => {
                const {
                    playlist: {track},
                } = await listenbrainzApi.get<ListenBrainz.PlaylistItemsResponse>(
                    `playlist/${getMediaObjectId(playlist)}`,
                    {offset, count},
                    true
                );
                offset += count;
                const items = track.map((track) => this.createMediaItem(track));
                return {items, total: items.length, atEnd: true};
            },
            {autofill: true, pageSize: 100}
        );
    }

    // (add|move|remove)Items will only be called if the playlist is complete.
    // Need to trust the UI on this.

    addItems(additions: readonly MediaItem[], atIndex = -1): void {
        additions = this.filterAdditions(additions);
        if (additions.length > 0) {
            this._addItems(additions, atIndex);
            this.synch$.next(true);
        }
    }

    moveItems(selection: readonly MediaItem[], toIndex: number): void {
        const items = moveSubset(this.items, selection, toIndex);
        if (items !== this.items) {
            this.items = items;
            this.synch$.next(true);
        }
    }

    removeItems(removals: readonly MediaItem[]): void {
        const srcsToRemove = new Set(removals.map((item) => item.src));
        const items = this.items.filter((item) => !srcsToRemove.has(item.src));
        this.size = items.length;
        this.items = items;
        this.updateTrackCount();
        this.synch$.next(true);
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            this.subscribeTo(
                this.synch$.pipe(
                    filter((synch) => synch),
                    debounceTime(500),
                    mergeMap(() => this.synch())
                ),
                logger
            );

            this.subscribeTo(
                this.observeComplete().pipe(
                    switchMap(() => observePlaylistAdditions(this.playlist)),
                    map((items) => this.filterAdditions(items)),
                    filter((items) => items.length > 0),
                    tap((items) => this._addItems(items))
                ),
                logger
            );
        }
    }

    private _addItems(additions: readonly MediaItem[], atIndex = -1): void {
        additions = additions.map((item) => ({
            ...item,
            src: `listenbrainz:track:${item.recording_mbid}`,
            externalUrl: `https://musicbrainz.org/recording/${item.recording_mbid}`,
        }));
        const items = this.items.slice();
        if (atIndex >= 0 && atIndex < items.length) {
            items.splice(atIndex, 0, ...additions);
        } else {
            items.push(...additions);
        }
        this.size = items.length;
        this.items = items;
        this.updateTrackCount();
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

    private filterAdditions(additions: readonly MediaItem[]): readonly MediaItem[] {
        return uniqBy('recording_mbid', additions).filter(
            (item) => !this.keys.has(`listenbrainz:track:${item.recording_mbid}`)
        );
    }

    private async synch(): Promise<void> {
        this.busy = true;
        try {
            this.error = undefined;
            await listenbrainzApi.clearPlaylist(this.playlist, this.size!);
            await listenbrainzApi.addToPlaylist(this.playlist, this.items);
            this.synch$.next(false);
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private updateTrackCount(): void {
        dispatchMetadataChanges({
            match: (object) => object.src === this.playlist.src,
            values: {trackCount: this.size},
        });
    }
}
