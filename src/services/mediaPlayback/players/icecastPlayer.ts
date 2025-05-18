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
import {filterNotEmpty, getTextFromHtml, loadLibrary, uniq} from 'utils';
import lastfmApi from 'services/lastfm/lastfmApi';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import {bestOf, findBestMatch, parsePlaylistFromUrl} from 'services/metadata';
import HTML5Player from './HTML5Player';

type IcecastMetadata = IcyMetadata & OggMetadata;

export class IcecastPlayer extends HTML5Player {
    private IcecastMetadataPlayer: typeof IcecastMetadataPlayer | null = null;
    private player: IcecastMetadataPlayer | null = null;
    private readonly metadata$ = new Subject<IcecastMetadata | undefined>();

    constructor(name = 'icecast') {
        super('audio', name);
    }

    observeNowPlaying(container: PlaylistItem): Observable<PlaylistItem> {
        return this.metadata$.pipe(
            map((metadata) => (this.src === container.src ? metadata : undefined)),
            distinctUntilChanged((a, b) => a?.StreamTitle === b?.StreamTitle),
            switchMap((metadata) =>
                metadata ? this.createNowPlayingItem(metadata, container) : of(container)
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
            metadataTypes: [item.playbackType === PlaybackType.IcecastOgg ? 'ogg' : 'icy'] as any,
            onMetadata: (metadata: IcecastMetadata) => {
                if (__dev__) {
                    this.logger.info('onMetadata', metadata);
                }
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
        return container.playbackType === PlaybackType.IcecastOgg
            ? this.createNowPlayingItemOgg(metadata, container)
            : this.createNowPlayingItemIcy(metadata, container);
    }

    private async createNowPlayingItemIcy(
        metadata: IcyMetadata,
        container: PlaylistItem
    ): Promise<PlaylistItem> {
        let artist = '';
        let title = getTextFromHtml(metadata?.StreamTitle).replace(/\n+/g, ' ');
        let album: string | undefined;
        if (!title) {
            return container;
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
            if (splitTitle.length >= 2) {
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
            return container;
        }

        const item = await this.addMetadata({
            id: nanoid(),
            src: `internet-radio:show:${metadata.StreamTitle}`,
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            linearType: LinearType.Show,
            title,
            artists: artist ? [artist] : undefined,
            album,
            stationName: container.linearType === LinearType.Station ? container.title : undefined,
            duration: 0,
            playedAt: 0,
            unplayable: true,
        });

        if (!item.thumbnails) {
            let thumbnails = container.thumbnails;
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
        container: PlaylistItem
    ): Promise<PlaylistItem> {
        const title = metadata.TITLE;
        if (!title) {
            return container;
        }
        const artist = metadata.ARTIST || '';
        const date = metadata.DATE || '';
        const genre = metadata.GENRE;

        const item = await this.addMetadata({
            id: nanoid(),
            src: `internet-radio:show:${artist}-${title}`,
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            linearType: LinearType.Show,
            title,
            artists: artist ? [artist] : undefined,
            album: metadata.ALBUM,
            genres: genre ? [genre] : undefined,
            stationName: container.linearType === LinearType.Station ? container.title : undefined,
            duration: 0,
            playedAt: 0,
            unplayable: true,
            isrc: metadata.ISRC,
            year: date ? new Date(date).getFullYear() || undefined : undefined,
        });

        if (!item.thumbnails) {
            const thumbnails = container.thumbnails;
            if (thumbnails) {
                return {...item, thumbnails};
            }
        }

        return item;
    }

    private async addMetadata(item: PlaylistItem): Promise<PlaylistItem> {
        const {artists: [artist = ''] = [], title} = item;
        if (artist) {
            const transposedItem = {...item, title: artist, artists: [title]};

            // First use MusicBrainzBadge.
            const mbItems = await musicbrainzApi.search(artist, title);
            let mbItem = musicbrainzApi.findBestMatch(mbItems, item);
            if (!mbItem) {
                mbItem = musicbrainzApi.findBestMatch(mbItems, transposedItem);
            }
            if (mbItem) {
                const enhancedItem = bestOf(mbItem, item) as PlaylistItem;
                const lastfmItem = await lastfmApi.addMetadata(enhancedItem);
                return {
                    ...enhancedItem,
                    src: item.src.replace(':show:', ':track:'),
                    linearType: LinearType.MusicTrack,
                    thumbnails: lastfmItem.thumbnails,
                    duration: item.duration || lastfmItem.duration,
                };
            }

            // last.fm search.
            const lastfmItems = await lastfmApi.search(`${artist} ${title}`);
            const lastfmItem = lastfmItems.find(
                (lastfmItem) =>
                    findBestMatch([lastfmItem], item) || findBestMatch([lastfmItem], transposedItem)
            );
            if (lastfmItem) {
                const {title, artists, thumbnails} = lastfmItem;
                return {
                    ...item,
                    src: item.src.replace(':show:', ':track:'),
                    linearType: LinearType.MusicTrack,
                    title,
                    artists,
                    thumbnails,
                };
            }

            // last.fm track info.
            const enhancedItem = await lastfmApi.addMetadata<PlaylistItem>(item, {overWrite: true});
            if (enhancedItem !== item) {
                return {
                    ...enhancedItem,
                    src: item.src.replace(':show:', ':track:'),
                    linearType: LinearType.MusicTrack,
                };
            }
        }
        return item;
    }

    private async loadPlayer(): Promise<typeof IcecastMetadataPlayer> {
        if (this.IcecastMetadataPlayer) {
            return this.IcecastMetadataPlayer;
        }
        await loadLibrary('icecast-metadata-player-1.17.12.main.min.js');
        const IcecastMetadataPlayer = (window as any).IcecastMetadataPlayer;
        if (!IcecastMetadataPlayer) {
            throw Error('Player not loaded');
        }
        this.IcecastMetadataPlayer = IcecastMetadataPlayer;
        return IcecastMetadataPlayer;
    }
}

export default new IcecastPlayer();
