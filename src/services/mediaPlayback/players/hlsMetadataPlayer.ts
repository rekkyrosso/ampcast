import type {Observable} from 'rxjs';
import {Subject, distinctUntilChanged, map, of, switchMap} from 'rxjs';
import {nanoid} from 'nanoid';
import {HlsConfig} from 'hls.js';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import Thumbnail from 'types/Thumbnail';
import {groupBy} from 'utils';
import {addMetadata, dispatchMetadataChanges} from 'services/metadata';
import HLSPlayer from './HLSPlayer';

type TAG = string;

interface ID3Tag {
    readonly key: TAG;
    readonly info: string;
    readonly data: string;
}

interface HLSMetadata {
    readonly key: string;
    readonly title: string;
    readonly tags: Record<TAG, readonly ID3Tag[]>;
}

export class HLSMetadataPlayer extends HLSPlayer {
    protected config: Partial<HlsConfig> = {enableID3MetadataCues: true};
    private readonly metadata$ = new Subject<HLSMetadata | undefined>();
    private currentStationName = '';

    constructor(name = 'hls-metadata') {
        super('audio', name);

        this.observeItem().subscribe(() => (this.currentStationName = ''));

        this.element.textTracks.addEventListener('addtrack', (event) => {
            event.track?.addEventListener('cuechange', () => {
                const tracks = [...this.element.textTracks];
                const track = tracks.find(
                    (track) => track.kind === 'metadata' && track.label === 'id3'
                );
                if (track?.activeCues) {
                    const data = [];
                    for (const cue of track.activeCues) {
                        data.push((cue as any).value);
                    }
                    const tags = groupBy<any, string>(data, 'key');
                    const title = tags.TIT2?.[0].data || '';
                    if (title) {
                        const artist = tags.TPE1?.[0].data || '';
                        const key = artist ? `${artist} - ${title}` : title;
                        const metadata = {key, title, tags};
                        this.metadata$.next(metadata);
                    } else {
                        this.metadata$.next(undefined);
                    }
                }
            });
        });
    }

    observeNowPlaying(container: PlaylistItem): Observable<PlaylistItem> {
        return this.metadata$.pipe(
            map((metadata) => (this.src === container.src ? metadata : undefined)),
            distinctUntilChanged((a, b) => a?.key === b?.key),
            switchMap((metadata) =>
                metadata ? this.createNowPlayingItem(metadata, container) : of(container)
            )
        );
    }

    private async createNowPlayingItem(
        metadata: HLSMetadata,
        container: PlaylistItem
    ): Promise<PlaylistItem> {
        if (__dev__) {
            this.logger.info('onMetadata', metadata);
        }
        try {
            const id3 = this.createId3TagReader(metadata);
            const artist = id3('TPE1');
            const stationName = id3('TRSN');
            const item = await addMetadata<PlaylistItem>(
                {
                    id: nanoid(),
                    src: `internet-radio:track:${metadata.key}`,
                    itemType: ItemType.Media,
                    mediaType: MediaType.Audio,
                    linearType: LinearType.MusicTrack,
                    title: metadata.title,
                    description: id3('TIT3'),
                    album: id3('ALB'),
                    artists: artist ? [artist] : undefined,
                    stationName:
                        container.linearType === LinearType.Station ? container.title : stationName,
                    duration: Number(id3('TLEN')) / 1000 || 0,
                    playedAt: 0,
                    year: Number(id3('TORY')) || undefined,
                    unplayable: true,
                    badge: id3('TFLT'),
                    bitRate: Number(id3('TXXX', 'adr')) || undefined,
                    isrc: id3('TSRC'),
                    externalUrl: id3('WORS'),
                },
                true
            );
            if (stationName && stationName !== this.currentStationName) {
                this.currentStationName = stationName;
                this.updateStationMetadata(stationName, metadata, container);
            }
            if (!item.thumbnails) {
                const thumbnails =
                    this.createThumbnails(metadata.tags.WXXX) || container.thumbnails;
                if (thumbnails) {
                    return {...item, thumbnails};
                }
            }
            return item;
        } catch (err) {
            this.logger.error(err);
            return container;
        }
    }

    private createThumbnails(
        tags: readonly ID3Tag[] | undefined
    ): readonly Thumbnail[] | undefined {
        const thumbnails = tags
            ?.filter((tag) => tag.info.startsWith('artworkURL_'))
            .map((tag) => {
                const width = Number(tag.info.replace(/^artworkURL_(\d+).*$/, '$1')) || 0;
                const url = tag.data.replace('/somafm.com/', '/api.somafm.com/');
                return {url, width, height: width};
            })
            .filter((thumbnail) => thumbnail.width > 0);
        return thumbnails?.length ? thumbnails : undefined;
    }

    private updateStationMetadata(
        stationName: string,
        metadata: HLSMetadata,
        container: PlaylistItem
    ): void {
        if (container.linearType) {
            // It already knows it's a station.
            return;
        }
        const id3 = this.createId3TagReader(metadata);
        dispatchMetadataChanges<MediaItem>({
            match: (item) => item.src === container.src,
            values: {
                title: stationName,
                linearType: LinearType.Station,
                description: id3('TRSO'),
                badge: id3('TFLT'),
                bitRate: Number(id3('TXXX', 'adr')) || undefined,
                externalUrl: id3('WORS'),
            },
        });
    }

    private createId3TagReader(
        metadata: HLSMetadata
    ): (key: string, info?: string) => string | undefined {
        return (key, info) => {
            const tags = metadata.tags[key];
            return (info ? tags?.find((tag) => tag.info === info) : tags?.[0])?.data;
        };
    }
}

export default new HLSMetadataPlayer();
