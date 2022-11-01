import type {Observable} from 'rxjs';
import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import Pager, {Page} from 'types/Pager';
import Thumbnail from 'types/Thumbnail';
import SequentialPager from 'services/SequentialPager';
import musicbrainzApi from './musicbrainzApi';

export default class MusicBrainzAlbumPager implements Pager<MediaItem> {
    private readonly pager: Pager<MediaItem>;

    constructor(private readonly mbid: string, album?: Except<MediaAlbum, 'pager'>) {
        this.pager = new SequentialPager<MediaItem>(async (): Promise<Page<MediaItem>> => {
            const {media = []} = await musicbrainzApi.get<MusicBrainz.Release>(`release/${mbid}`, {
                inc: 'recordings',
            });
            const items = this.createItems(media[0]?.tracks || [], album);
            return {items, atEnd: true};
        });
    }

    observeComplete(): Observable<readonly MediaItem[]> {
        return this.pager.observeComplete();
    }

    observeItems(): Observable<readonly MediaItem[]> {
        return this.pager.observeItems();
    }

    observeSize(): Observable<number> {
        return this.pager.observeSize();
    }

    observeMaxSize(): Observable<number> {
        return this.pager.observeMaxSize();
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

        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `musicbrainz:track:${recording.id}`,
            title: track.title,
            artist: album?.artist,
            albumArtist: album?.artist,
            album: album?.title,
            duration: track.length / 1000 || 0,
            track: track.number ? Number(track.number) : undefined,
            recording_mbid: recording.id,
            release_mbid: this.mbid,
            year:
                album?.year ||
                new Date(recording['first-release-date']).getUTCFullYear() ||
                undefined,
            playedAt: 0,
            thumbnails: album?.thumbnails || this.createThumbnails(),
        };
    }

    private createThumbnails(): Thumbnail[] {
        return [musicbrainzApi.getAlbumCover(this.mbid)];
    }
}
