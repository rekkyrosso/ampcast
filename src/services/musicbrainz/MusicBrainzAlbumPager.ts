import type {Observable} from 'rxjs';
import {nanoid} from 'nanoid';
import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import Pager, {Page} from 'types/Pager';
import SequentialPager from 'services/pagers/SequentialPager';
import musicbrainzApi from './musicbrainzApi';

export default class MusicBrainzAlbumPager implements Pager<MediaItem> {
    private readonly pager: Pager<MediaItem>;

    constructor(private readonly release_mbid: string, album?: Except<MediaAlbum, 'pager'>) {
        this.pager = new SequentialPager<MediaItem>(async (): Promise<Page<MediaItem>> => {
            const {media = []} = await musicbrainzApi.get<MusicBrainz.Release>(
                `release/${release_mbid}`,
                {inc: 'recordings'}
            );
            const items = this.createItems(media[0]?.tracks || [], album);
            return {items, atEnd: true};
        });
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
    }

    fetchAt(index: number, length: number): void {
        this.pager.fetchAt(index, length);
    }

    private createItems(
        items: readonly MusicBrainz.Track[],
        album?: Except<MediaAlbum, 'pager'>
    ): MediaItem[] {
        return items.map((item) => this.createItem(item, album));
    }

    private createItem(track: MusicBrainz.Track, album?: Except<MediaAlbum, 'pager'>): MediaItem {
        const recording = track.recording;
        const mbid = recording.id || undefined;

        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `musicbrainz:track:${mbid || nanoid()}`,
            title: track.title,
            artists: album?.artist ? [album.artist] : undefined,
            albumArtist: album?.artist,
            album: album?.title,
            duration: track.length / 1000 || 0,
            track: track.number ? Number(track.number) : undefined,
            recording_mbid: mbid,
            track_mbid: track.id,
            release_mbid: this.release_mbid,
            year:
                album?.year ||
                new Date(recording['first-release-date']).getUTCFullYear() ||
                undefined,
            playedAt: 0,
            externalUrl: mbid ? `https://musicbrainz.org/recording/${mbid}` : undefined,
        };
    }
}
