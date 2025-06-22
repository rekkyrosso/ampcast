import {filter, map, mergeMap} from 'rxjs';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import {Page, PagerConfig} from 'types/Pager';
import {musicBrainzHost} from 'services/musicbrainz';
import MusicBrainzAlbumTracksPager from 'services/musicbrainz/MusicBrainzAlbumTracksPager';
import ErrorPager from 'services/pagers/ErrorPager';
import SequentialPager from 'services/pagers/SequentialPager';
import SimplePager from 'services/pagers/SimplePager';
import {Logger} from 'utils';
import listenbrainzApi from './listenbrainzApi';

const logger = new Logger('ListenBrainzStatsPager');

export default class ListenBrainzStatsPager<T extends MediaObject> extends SequentialPager<T> {
    constructor(
        path: string,
        params?: Record<string, string | number | boolean>,
        options?: Partial<PagerConfig>
    ) {
        let offset = 0;

        super(
            async (count: number): Promise<Page<T>> => {
                try {
                    const response = await listenbrainzApi.get<ListenBrainz.Stats.Response>(path, {
                        ...params,
                        offset,
                        count,
                    });
                    offset += count;
                    return this.createPage(response);
                } catch (err) {
                    if (this.isNoContentError(err)) {
                        return {items: [], atEnd: true};
                    }
                    throw err;
                }
            },
            {pageSize: 50, ...options}
        );
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            this.subscribeTo(
                this.observeAdditions().pipe(
                    map((items) => items.filter((item) => item.itemType === ItemType.Media)),
                    filter((items) => items.length > 0),
                    mergeMap((items) => listenbrainzApi.addUserData(items as readonly MediaItem[]))
                ),
                logger
            );
        }
    }

    private createPage(response: ListenBrainz.Stats.Response): Page<T> {
        if (this.isRecordingsResponse(response)) {
            const payload = response.payload;
            const items = payload.recordings.map((item) => this.createMediaItem(item) as T);
            const total = payload.total_recording_count;
            const atEnd = payload.offset + items.length >= total;
            return {items, total, atEnd};
        } else if (this.isReleasesResponse(response)) {
            const payload = response.payload;
            const items = payload.releases.map((item) => this.createMediaAlbum(item) as T);
            const total = payload.total_release_count;
            const atEnd = payload.offset + items.length >= total;
            return {items, total, atEnd};
        } else if (this.isArtistsResponse(response)) {
            const payload = response.payload;
            const items = payload.artists.map((item) => this.createMediaArtist(item) as T);
            const total = payload.total_artist_count;
            const atEnd = payload.offset + items.length >= total;
            return {items, total, atEnd};
        } else {
            throw Error('Unknown response');
        }
    }

    private createMediaArtist(item: ListenBrainz.Artist): MediaArtist {
        const mbid = item.artist_mbids?.[0] || undefined;
        return {
            itemType: ItemType.Artist,
            src: `listenbrainz:artist:${nanoid()}`,
            externalUrl: mbid ? `${musicBrainzHost}/artist/${mbid}` : undefined,
            title: item.artist_name,
            artist_mbid: mbid,
            playCount: item.listen_count,
            pager: new SimplePager(),
        };
    }

    private createMediaAlbum(item: ListenBrainz.Release): MediaAlbum {
        const mbid = item.release_mbid || undefined;
        return {
            itemType: ItemType.Album,
            src: `listenbrainz:album:${nanoid()}`,
            externalUrl: mbid ? `${musicBrainzHost}/release/${mbid}` : undefined,
            title: item.release_name,
            artist: item.artist_name,
            release_mbid: mbid,
            artist_mbids: item.artist_mbids,
            caa_mbid: item?.caa_release_mbid,
            playCount: item.listen_count,
            trackCount: undefined,
            pager: mbid
                ? new MusicBrainzAlbumTracksPager(mbid)
                : new ErrorPager(Error('No MusicBrainz id')),
        };
    }

    private createMediaItem(item: ListenBrainz.Recording): MediaItem {
        const mbid = item.recording_mbid || undefined;
        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `listenbrainz:track:${nanoid()}`,
            externalUrl: mbid ? `${musicBrainzHost}/recording/${mbid}` : undefined,
            title: item.track_name,
            artists: item.artist_name ? [item.artist_name] : undefined,
            album: item.release_name ?? undefined,
            duration: 0,
            recording_mbid: mbid,
            release_mbid: item.release_mbid || undefined,
            artist_mbids: item.artist_mbids,
            caa_mbid: item?.caa_release_mbid,
            playCount: item.listen_count,
            playedAt: 0,
        };
    }

    private isRecordingsResponse(
        response: ListenBrainz.Stats.Response
    ): response is ListenBrainz.Stats.Recordings {
        return 'recordings' in response.payload;
    }

    private isReleasesResponse(
        response: ListenBrainz.Stats.Response
    ): response is ListenBrainz.Stats.Releases {
        return 'releases' in response.payload;
    }

    private isArtistsResponse(
        response: ListenBrainz.Stats.Response
    ): response is ListenBrainz.Stats.Artists {
        return 'artists' in response.payload;
    }

    private isNoContentError(err: any): boolean {
        return err?.status === 204;
    }
}
