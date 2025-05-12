import type {Observable} from 'rxjs';
import {Subject, distinctUntilChanged, map, mergeMap} from 'rxjs';
import IcecastMetadataPlayer, {IcyMetadata} from 'icecast-metadata-player';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaType from 'types/MediaType';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import RadioStation from 'types/RadioStation';
import {uniq} from 'utils';
import {addMetadata} from 'services/metadata';
import HTML5Player from './HTML5Player';
import {parsePlaylistFromUrl} from './playlistParser';

export class IcecastPlayer extends HTML5Player {
    private player: IcecastMetadataPlayer | null = null;
    private readonly nowPlaying$ = new Subject<IcyMetadata | undefined>();

    constructor(name = 'icecast') {
        super('audio', name);
    }

    observeNowPlaying(station: RadioStation): Observable<PlaylistItem | null> {
        return this.nowPlaying$.pipe(
            map((metadata) => (this.src === station.src ? metadata : undefined)),
            distinctUntilChanged((a, b) => a?.StreamTitle === b?.StreamTitle),
            mergeMap((metadata) => this.createNowPlayingItem(metadata, station))
        );
    }

    seek(): void {
        this.logger.warn('Attempted seek on infinite stream.');
    }

    protected async loadAndPlay(item: PlayableItem): Promise<void> {
        this.loadedSrc = item.src;

        if (this.player) {
            await this.player.detachAudioElement();
        }

        let endpoints: readonly string[] = [];
        const url = this.getMediaSrc(item);
        if (item.playbackType === PlaybackType.Playlist) {
            endpoints = await parsePlaylistFromUrl(url);
        } else {
            endpoints = item.srcs?.[0] ? item.srcs : [url];
        }

        if (!endpoints?.[0]) {
            throw Error('No media source');
        }

        this.player = new IcecastMetadataPlayer(endpoints as string[], {
            audioElement: this.element,
            metadataTypes: ['icy'],
            onMetadata: (metadata: IcyMetadata) => {
                this.nowPlaying$.next(metadata);
            },
            onError: (message: string, error?: Error) => {
                this.error$.next(error || Error(message));
            },
            onWarn: (...messages: [string]) => {
                if (__dev__) {
                    this.logger.warn(...messages);
                }
            },
            onPlay: () => {
                this.playing$.next();
            },
            onStop: () => {
                if (!this.stopped) {
                    console.warn('IcecastMetadataPlayer::onStop', `this.stopped=${this.stopped}`);
                }
            },
        });

        if (!this.paused) {
            try {
                await this.player!.play();
            } catch (err) {
                if (!this.paused) {
                    throw err;
                }
            }
        }
    }

    protected async safePause(): Promise<void> {
        this.safeStop();
    }

    protected async safePlay(): Promise<void> {
        try {
            if (this.item && this.player?.state !== 'playing') {
                await this.loadAndPlay(this.item);
            }
        } catch (err) {
            if (!this.paused) {
                this.error$.next(err);
            }
        }
    }

    protected async safeReload(): Promise<void> {
        if (this.autoplay) {
            await this.safePlay();
        }
    }

    protected async safeStop(): Promise<void> {
        try {
            await this.player?.stop();
        } catch (err) {
            this.logger.warn(err);
        }
        this.nowPlaying$.next(undefined);
    }

    protected async createPlayer(): Promise<void> {
        // Not needed
    }

    private async createNowPlayingItem(
        metadata: IcyMetadata | undefined,
        station: RadioStation
    ): Promise<PlaylistItem | null> {
        if (!metadata) {
            return null;
        }
        let artist = '';
        let title = metadata?.StreamTitle;
        if (!title) {
            return null;
        }
        let splitTitle = title.split(/\s+-\s+/);
        if (splitTitle.length > 2) {
            splitTitle = uniq(splitTitle);
        }
        if (splitTitle.length > 1) {
            [artist, title] = splitTitle;
        }
        const item = await addMetadata<PlaylistItem>(
            {
                id: nanoid(),
                src: `internet-radio:track:${metadata.StreamTitle}`,
                itemType: ItemType.Media,
                mediaType: MediaType.Audio,
                linearType: LinearType.MusicTrack,
                title,
                artists: artist ? [artist] : undefined,
                stationName: station.title,
                duration: 0,
                playedAt: 0,
                unplayable: true,
            },
            true
        );
        if (!item.thumbnails) {
            let thumbnails = station.thumbnails;
            if (metadata.StreamUrl) {
                thumbnails = [
                    {
                        url: metadata.StreamUrl.replace('/somafm.com/', '/api.somafm.com/'),
                        width: 500,
                        height: 500,
                    },
                ];
            }
            if (thumbnails) {
                return {...item, thumbnails};
            }
        }
        return item;
    }
}

export default new IcecastPlayer();
