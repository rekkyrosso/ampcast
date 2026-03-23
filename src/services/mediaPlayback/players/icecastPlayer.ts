import type {Observable} from 'rxjs';
import {Subject, distinctUntilChanged, map, of, switchMap} from 'rxjs';
import {nanoid} from 'nanoid';
import type IcecastMetadataPlayer from 'icecast-metadata-player';
import type {IcyMetadata, OggMetadata} from 'icecast-metadata-player';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaType from 'types/MediaType';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import {filterNotEmpty, getTextFromHtml, loadLibrary, toUtf8, uniq} from 'utils';
import {addMetadataToRadioTrack, parsePlaylistFromUrl} from 'services/metadata';
import HTML5Player from './HTML5Player';

type IcecastMetadata = IcyMetadata & OggMetadata;

export class IcecastPlayer extends HTML5Player {
    private IcecastMetadataPlayer: typeof IcecastMetadataPlayer | null = null;
    private player: IcecastMetadataPlayer | null = null;
    private readonly metadata$ = new Subject<IcecastMetadata | undefined>();

    constructor(name = 'icecast') {
        super('audio', name);
    }

    observeNowPlaying(station: PlaylistItem): Observable<PlaylistItem> {
        return this.metadata$.pipe(
            map((metadata) => (this.src === station.src ? metadata : undefined)),
            distinctUntilChanged((a, b) => a?.StreamTitle === b?.StreamTitle),
            switchMap((metadata) =>
                metadata ? this.createNowPlayingItem(metadata, station) : of(station)
            )
        );
    }

    protected async loadAndPlay(item: PlayableItem): Promise<void> {
        this.loadedSrc = item.src;

        if (this.player) {
            await this.player.detachAudioElement();
        }

        let endpoints: readonly string[] = [];
        const url = this.getMediaSrc(item);
        if (item.playbackType === PlaybackType.IcecastM3u) {
            endpoints = await parsePlaylistFromUrl(url);
        } else {
            endpoints = item.srcs?.[0] ? item.srcs : [url];
        }

        if (!endpoints?.[0]) {
            throw Error('No media source');
        }

        const IcecastMetadataPlayer = await this.loadPlayer();

        this.player = new IcecastMetadataPlayer(endpoints as string[], {
            playbackMethod: 'html5',
            audioElement: this.element,
            metadataTypes: item.playbackType === PlaybackType.IcecastOgg ? ['icy', 'ogg'] : ['icy'],
            onMetadata: (metadata: IcecastMetadata) => {
                this.metadata$.next(metadata);
            },
            onError: (message: string, error?: Error) => {
                this.error$.next(error || Error(message));
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
        this.metadata$.next(undefined);
    }

    protected async createPlayer(): Promise<void> {
        // Not needed
    }

    private async createNowPlayingItem(
        metadata: IcecastMetadata,
        container: PlaylistItem
    ): Promise<PlaylistItem> {
        try {
            return metadata.TITLE
                ? this.createNowPlayingItemOgg(metadata, container)
                : this.createNowPlayingItemIcy(metadata, container);
        } catch (err) {
            this.logger.error(err);
            return container;
        }
    }

    private async createNowPlayingItemIcy(
        metadata: IcyMetadata,
        station: PlaylistItem
    ): Promise<PlaylistItem> {
        let artist = '';
        let title = getTextFromHtml(toUtf8(metadata?.StreamTitle || '')).replace(/\n+/g, ' ');
        let album: string | undefined;
        if (!title) {
            return station;
        }
        const trimRegExp = /^[-\s]+|[-\s]+$/;
        const matchWithQuotes = /^"([^"]+)" by ([^"]+) from "([^"]*)"$/i.exec(title);
        if (matchWithQuotes) {
            [, title, artist, album] = matchWithQuotes;
        } else {
            let splitTitle = title.split(/\s+-\s+/);
            if (splitTitle.length === 1) {
                splitTitle = title.split('-');
            }
            // Trim '-' and ' '.
            splitTitle = splitTitle
                .map((title) => title.replace(trimRegExp, ''))
                .filter((title) => title !== '');
            if (splitTitle.length > 2) {
                splitTitle = uniq(splitTitle);
                if (splitTitle.length > 2) {
                    splitTitle = filterNotEmpty(
                        splitTitle,
                        (text) => !/radio|stream|twitter|facebook|\dfm\b|@\w+/i.test(text)
                    );
                }
            }
            if (splitTitle.length > 1) {
                [artist, title] = splitTitle;
            } else {
                title = splitTitle[0];
            }
        }
        if (!title) {
            return station;
        }

        const item = await addMetadataToRadioTrack<PlaylistItem>({
            id: nanoid(),
            src: `internet-radio:show:${metadata.StreamTitle}`,
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            linearType: LinearType.Show,
            title,
            artists: artist ? [artist] : undefined,
            album,
            stationName: station.linearType === LinearType.Station ? station.title : undefined,
            stationSrc: station.src,
            duration: 0,
            playedAt: 0,
        });

        if (!item.thumbnails) {
            let thumbnails = station.thumbnails;
            if (metadata.StreamUrl?.startsWith('http')) {
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

    private async createNowPlayingItemOgg(
        metadata: OggMetadata,
        station: PlaylistItem
    ): Promise<PlaylistItem> {
        const title = metadata.TITLE;
        if (!title) {
            return station;
        }
        const artist = metadata.ARTIST || '';
        const date = metadata.DATE || '';
        const genre = metadata.GENRE;

        const item = await addMetadataToRadioTrack<PlaylistItem>({
            id: nanoid(),
            src: `internet-radio:show:${artist}-${title}`,
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            linearType: LinearType.Show,
            title,
            artists: artist ? [artist] : undefined,
            album: metadata.ALBUM,
            genres: genre ? [genre] : undefined,
            stationName: station.linearType === LinearType.Station ? station.title : undefined,
            stationSrc: station.src,
            duration: 0,
            playedAt: 0,
            isrc: metadata.ISRC,
            year: date ? new Date(date).getFullYear() || undefined : undefined,
        });

        if (!item.thumbnails) {
            const thumbnails = station.thumbnails;
            if (thumbnails) {
                return {...item, thumbnails};
            }
        }

        return item;
    }

    private async loadPlayer(): Promise<typeof IcecastMetadataPlayer> {
        if (this.IcecastMetadataPlayer) {
            return this.IcecastMetadataPlayer;
        }
        await loadLibrary(`icecast-metadata-player-${__icecast_player_version__}.main.min.js`);
        const IcecastMetadataPlayer = (window as any).IcecastMetadataPlayer;
        if (!IcecastMetadataPlayer) {
            throw Error('Player not loaded');
        }
        this.IcecastMetadataPlayer = IcecastMetadataPlayer;
        return IcecastMetadataPlayer;
    }
}

export default new IcecastPlayer();
