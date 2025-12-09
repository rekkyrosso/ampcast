import type {Observable} from 'rxjs';
import {Except, SetOptional, Writable} from 'type-fest';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import LibraryAction from 'types/LibraryAction';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaFolder from 'types/MediaFolder';
import MediaListLayout from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {PersonalMediaServiceId} from 'types/MediaServiceId';
import MediaSource, {MediaMultiSource, MediaSourceItems} from 'types/MediaSource';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaService from 'types/PersonalMediaService';
import PlayableItem from 'types/PlayableItem';
import Pin, {Pinnable} from 'types/Pin';
import PlaybackType from 'types/PlaybackType';
import ServiceType from 'types/ServiceType';
import {exists, getTextFromHtml, Logger, uniq} from 'utils';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import FolderBrowser from 'components/MediaBrowser/FolderBrowser';
import {
    albumsLayout,
    artistsLayout,
    mediaItemsLayout,
    mostPlayedTracksLayout,
    radiosLayoutSmall,
    recentlyAddedAlbumsLayout,
} from 'components/MediaList/layouts';
import SubsonicApi from './SubsonicApi';
import SubsonicAuth from './SubsonicAuth';
import SubsonicPager from './SubsonicPager';
import subsonicScrobbler from './subsonicScrobbler';
import SubsonicSettings from './SubsonicSettings';

function addRating(layout: MediaListLayout): MediaListLayout {
    return {
        ...layout,
        details: uniq(layout.details.concat('Rating')),
    };
}

const subsonicAlbumsLayout: MediaListLayout = addRating(albumsLayout);
const subsonicAlbums: MediaSourceItems = {
    layout: subsonicAlbumsLayout,
};
const subsonicTracks: MediaSourceItems = {
    layout: addRating(mediaItemsLayout),
};

export default class SubsonicService implements PersonalMediaService {
    readonly api: SubsonicApi;
    readonly logger = new Logger(this.id);
    readonly settings: SubsonicSettings;
    readonly serviceType = ServiceType.PersonalMedia;
    readonly icon = this.id;
    readonly root: MediaMultiSource;
    readonly sources: PersonalMediaService['sources'];
    readonly labels: Partial<Record<LibraryAction, string>>;
    readonly editablePlaylists: MediaSource<MediaPlaylist>;
    readonly observeIsLoggedIn: (this: unknown) => Observable<boolean>;
    readonly isConnected: (this: unknown) => boolean;
    readonly isLoggedIn: (this: unknown) => boolean;
    readonly login: (this: unknown) => Promise<void>;
    readonly logout: (this: unknown) => Promise<void>;
    readonly reconnect: (this: unknown) => Promise<void>;

    constructor(
        readonly id: PersonalMediaServiceId,
        readonly name: string,
        readonly url: string,
        readonly listingName?: string
    ) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const service = this;
        const settings = (this.settings = new SubsonicSettings(id));
        const api = (this.api = new SubsonicApi(id, settings));
        const auth = new SubsonicAuth(this);

        this.observeIsLoggedIn = auth.observeIsLoggedIn.bind(auth);
        this.isConnected = auth.isConnected.bind(auth);
        this.isLoggedIn = auth.isLoggedIn.bind(auth);
        this.login = auth.login.bind(auth);
        this.logout = auth.logout.bind(auth);
        this.reconnect = auth.reconnect.bind(auth);

        const search: MediaMultiSource = {
            id: `${id}/search`,
            title: 'Search',
            icon: 'search',
            searchable: true,
            sources: [
                this.createSearch<MediaItem>(ItemType.Media, {
                    id: 'songs',
                    title: 'Songs',
                }),
                this.createSearch<MediaAlbum>(ItemType.Album, {
                    id: 'albums',
                    title: 'Albums',
                    primaryItems: subsonicAlbums,
                }),
                this.createSearch<MediaArtist>(ItemType.Artist, {
                    id: 'artists',
                    title: 'Artists',
                }),
            ],
        };

        const likedSongs: MediaSource<MediaItem> = {
            id: `${id}/liked-songs`,
            title: 'My Songs',
            icon: 'heart',
            itemType: ItemType.Media,
            lockActionsStore: true,
            primaryItems: subsonicTracks,

            search(): Pager<MediaItem> {
                return new SubsonicPager(
                    service,
                    ItemType.Media,
                    async (): Promise<Page<Subsonic.Song>> => {
                        const items = await api.getLikedSongs();
                        return {items, atEnd: true};
                    }
                );
            },
        };

        const likedAlbums: MediaSource<MediaAlbum> = {
            id: `${id}/liked-albums`,
            title: 'My Albums',
            icon: 'heart',
            itemType: ItemType.Album,
            lockActionsStore: true,
            primaryItems: subsonicAlbums,

            search(): Pager<MediaAlbum> {
                return new SubsonicPager(
                    service,
                    ItemType.Album,
                    async (): Promise<Page<Subsonic.Album>> => {
                        const items = await api.getLikedAlbums();
                        return {items};
                    }
                );
            },
        };

        const likedArtists: MediaSource<MediaArtist> = {
            id: `${id}/liked-artists`,
            title: 'My Artists',
            icon: 'heart',
            itemType: ItemType.Artist,
            lockActionsStore: true,
            defaultHidden: true,
            primaryItems: {
                layout: addRating(artistsLayout),
            },

            search(): Pager<MediaArtist> {
                return new SubsonicPager(
                    service,
                    ItemType.Artist,
                    async (): Promise<Page<Subsonic.Artist>> => {
                        const items = await api.getLikedArtists();
                        return {items};
                    }
                );
            },
        };

        const topAlbums: MediaSource<MediaAlbum> = {
            id: `${id}/top-albums`,
            title: 'Top Rated',
            icon: 'star',
            itemType: ItemType.Album,
            lockActionsStore: true,
            defaultHidden: true,
            primaryItems: {
                layout: {
                    ...subsonicAlbumsLayout,
                    card: {
                        ...subsonicAlbumsLayout.card,
                        data: 'Rating',
                    },
                },
            },

            search(): Pager<MediaAlbum> {
                return new SubsonicPager(
                    service,
                    ItemType.Album,
                    async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                        const items = await api.getTopAlbums(offset, count);
                        return {items};
                    }
                );
            },
        };

        const recentlyAdded: MediaSource<MediaAlbum> = {
            id: `${id}/recently-added`,
            title: 'Recently Added',
            icon: 'recently-added',
            itemType: ItemType.Album,
            primaryItems: {
                layout: addRating(recentlyAddedAlbumsLayout),
            },

            search(): Pager<MediaAlbum> {
                return new SubsonicPager(
                    service,
                    ItemType.Album,
                    async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                        const items = await api.getRecentlyAdded(offset, count);
                        return {items};
                    }
                );
            },
        };

        const recentlyPlayed: MediaSource<MediaAlbum> = {
            id: `${id}/recently-played`,
            title: 'Recently Played',
            icon: 'clock',
            itemType: ItemType.Album,
            primaryItems: subsonicAlbums,

            search(): Pager<MediaAlbum> {
                return new SubsonicPager(
                    service,
                    ItemType.Album,
                    async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                        const items = await api.getRecentlyPlayed(offset, count);
                        return {items};
                    }
                );
            },
        };

        const mostPlayed: MediaSource<MediaAlbum> = {
            id: `${id}/most-played`,
            title: 'Most Played',
            icon: 'most-played',
            itemType: ItemType.Album,
            primaryItems: {
                layout: addRating(mostPlayedTracksLayout),
            },

            search(): Pager<MediaAlbum> {
                return new SubsonicPager(
                    service,
                    ItemType.Album,
                    async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                        const items = await api.getMostPlayed(offset, count);
                        return {items};
                    }
                );
            },
        };

        const playlists: MediaSource<MediaPlaylist> = {
            id: `${id}/playlists`,
            title: 'Playlists',
            icon: 'playlist',
            itemType: ItemType.Playlist,

            search(): Pager<MediaPlaylist> {
                return new SubsonicPager(
                    service,
                    ItemType.Playlist,
                    async (): Promise<Page<Subsonic.Playlist>> => {
                        const items = await api.getPlaylists();
                        return {items, atEnd: true};
                    }
                );
            },
        };

        const tracksByGenre: MediaSource<MediaItem> = {
            id: `${id}/tracks-by-genre`,
            title: 'Songs by Genre',
            icon: 'genre',
            itemType: ItemType.Media,
            filterType: FilterType.ByGenre,
            defaultHidden: true,
            primaryItems: subsonicTracks,

            search(genre?: MediaFilter): Pager<MediaItem> {
                if (genre) {
                    return new SubsonicPager(
                        service,
                        ItemType.Media,
                        async (
                            offset: number,
                            count: number
                        ): Promise<Page<Subsonic.MediaItem>> => {
                            const items = await api.getSongsByGenre(genre.id, offset, count);
                            return {items, total: genre.count};
                        }
                    );
                } else {
                    return new SimplePager();
                }
            },
        };

        const albumsByGenre: MediaSource<MediaAlbum> = {
            id: `${id}/albums-by-genre`,
            title: 'Albums by Genre',
            icon: 'genre',
            itemType: ItemType.Album,
            filterType: FilterType.ByGenre,
            primaryItems: subsonicAlbums,

            search(genre?: MediaFilter): Pager<MediaAlbum> {
                if (genre) {
                    return new SubsonicPager(
                        service,
                        ItemType.Album,
                        async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                            const items = await api.getAlbumsByGenre(genre.id, offset, count);
                            return {items, total: genre.count};
                        }
                    );
                } else {
                    return new SimplePager();
                }
            },
        };

        const albumsByDecade: MediaSource<MediaAlbum> = {
            id: `${id}/albums-by-decade`,
            title: 'Albums by Decade',
            icon: 'calendar',
            itemType: ItemType.Album,
            filterType: FilterType.ByDecade,
            primaryItems: subsonicAlbums,

            search(decade?: MediaFilter): Pager<MediaAlbum> {
                if (decade) {
                    return new SubsonicPager(
                        service,
                        ItemType.Album,
                        async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                            const items = await api.getAlbumsByDecade(decade.id, offset, count);
                            return {items};
                        }
                    );
                } else {
                    return new SimplePager();
                }
            },
        };

        const randomTracks: MediaSource<MediaItem> = {
            id: `${id}/random-tracks`,
            title: 'Random Songs',
            icon: 'shuffle',
            itemType: ItemType.Media,
            defaultHidden: true,
            primaryItems: subsonicTracks,

            search(): Pager<MediaItem> {
                return new SubsonicPager(service, ItemType.Media, async () => {
                    const items = await api.getRandomSongs(100);
                    return {items, atEnd: true};
                });
            },
        };

        const randomAlbums: MediaSource<MediaAlbum> = {
            id: `${id}/random-albums`,
            title: 'Random Albums',
            icon: 'shuffle',
            itemType: ItemType.Album,
            defaultHidden: true,
            primaryItems: subsonicAlbums,

            search(): Pager<MediaAlbum> {
                return new SubsonicPager(service, ItemType.Album, async () => {
                    const items = await api.getRandomAlbums(100);
                    return {items, atEnd: true};
                });
            },
        };

        const musicVideos: MediaSource<MediaItem> = {
            id: `${id}/videos`,
            title: 'Music Videos',
            icon: 'video',
            itemType: ItemType.Media,
            mediaType: MediaType.Video,
            defaultHidden: true,
            primaryItems: {
                label: 'Videos',
            },

            search(): Pager<MediaItem> {
                return new SubsonicPager(
                    service,
                    ItemType.Media,
                    async (): Promise<Page<Subsonic.Video>> => {
                        const items = await api.getVideos();
                        return {items, atEnd: true};
                    }
                );
            },
        };

        const radio: MediaSource<MediaItem> = {
            id: `${id}/radio`,
            title: 'Radio',
            icon: 'radio',
            itemType: ItemType.Media,
            linearType: LinearType.Station,
            defaultHidden: true,
            primaryItems: {
                label: 'Radios',
                layout: radiosLayoutSmall,
            },

            search(): Pager<MediaItem> {
                return new SubsonicPager(
                    service,
                    ItemType.Media,
                    async (): Promise<Page<Subsonic.Radio>> => {
                        const items = await api.getInternetRadioStations();
                        return {items, atEnd: true};
                    }
                );
            },
        };

        const folders: MediaSource<MediaFolderItem> = {
            id: `${id}/folders`,
            title: 'Folders',
            icon: 'folder',
            itemType: ItemType.Folder,
            Component: FolderBrowser,

            search(): Pager<MediaFolderItem> {
                const root: Writable<SetOptional<MediaFolder, 'pager'>> = {
                    itemType: ItemType.Folder,
                    src: '',
                    title: 'Folders',
                    fileName: '',
                    path: '',
                };

                const sortByName = (a: {name: string}, b: {name: string}) =>
                    a.name.localeCompare(b.name);

                root.pager = new SimpleMediaPager<MediaFolderItem>(async () =>
                    settings.libraries
                        .filter(({id}) => !!id)
                        .map(({id, title}) => {
                            const rootFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
                                itemType: ItemType.Folder,
                                src: `${id}:folder:${id}`,
                                title: title,
                                fileName: title,
                                path: `/${title}`,
                            };
                            const parentFolder: MediaFolderItem = {
                                ...(root as MediaFolder),
                                fileName: '../',
                            };
                            const backPager = new SimplePager<MediaFolderItem>([parentFolder]);
                            const folderPager = new SubsonicPager<MediaFolderItem>(
                                service,
                                ItemType.Folder,
                                async (): Promise<Page<Subsonic.Directory>> => {
                                    const indexes = await api.getIndexes(id);
                                    return {
                                        items: indexes
                                            .map((index) =>
                                                index.artist.map(
                                                    ({id, name}) =>
                                                        ({
                                                            id,
                                                            name,
                                                            title: name,
                                                        } as Subsonic.Directory)
                                                )
                                            )
                                            .flat()
                                            .sort(sortByName),
                                        atEnd: true,
                                    };
                                },
                                undefined,
                                rootFolder as MediaFolder
                            );

                            rootFolder.pager = new WrappedPager<MediaFolderItem>(
                                backPager,
                                folderPager
                            );

                            return rootFolder as MediaFolder;
                        })
                );

                return root.pager;
            },
        };

        this.root = search;

        this.sources = [
            likedSongs,
            likedAlbums,
            likedArtists,
            ['ampache', 'gonic'].includes(this.id) ? topAlbums : undefined,
            recentlyAdded,
            recentlyPlayed,
            mostPlayed,
            radio,
            playlists,
            tracksByGenre,
            albumsByGenre,
            albumsByDecade,
            randomTracks,
            randomAlbums,
            musicVideos,
            folders,
        ].filter(exists);

        this.editablePlaylists = playlists;

        this.labels = {
            [Action.AddToLibrary]: `Like on ${name}`,
            [Action.RemoveFromLibrary]: `Unlike on ${name}`,
        };
    }

    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return this.settings.audioLibraries;
    }

    get host(): string {
        return this.settings.host;
    }

    get libraryId(): string {
        return this.settings.libraryId;
    }

    set libraryId(libraryId: string) {
        this.settings.libraryId = libraryId;
    }

    get libraries(): readonly PersonalMediaLibrary[] {
        return this.settings.libraries;
    }

    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        this.settings.libraries = libraries;
    }

    observeLibraryId(): Observable<string> {
        return this.settings.observeLibraryId();
    }

    async addToPlaylist<T extends MediaItem>(
        playlist: MediaPlaylist,
        items: readonly T[]
    ): Promise<void> {
        const playlistId = this.getIdFromSrc(playlist);
        return this.api.addToPlaylist(
            playlistId,
            items.map((item) => this.getIdFromSrc(item))
        );
    }

    canPin(item: MediaObject): boolean {
        return item.itemType === ItemType.Playlist;
    }

    canRate<T extends MediaObject>(item: T): boolean {
        switch (item.itemType) {
            case ItemType.Media:
                return item.mediaType === MediaType.Audio && !item.linearType;

            case ItemType.Album:
            case ItemType.Artist:
                return !item.synthetic;

            default:
                return false;
        }
    }

    canStore<T extends MediaObject>(item: T): boolean {
        switch (item.itemType) {
            case ItemType.Media:
                return !item.linearType;

            case ItemType.Album:
            case ItemType.Artist:
                return !item.synthetic;

            default:
                return false;
        }
    }

    compareForRating<T extends MediaObject>(a: T, b: T): boolean {
        // This is not exactly right for albums (folderId vs albumId).
        // The only way to fix it is to make this function async.
        // It works for the majority of cases though.
        return a.src === b.src;
    }

    async createPlaylist<T extends MediaItem>(
        name: string,
        {description = '', isPublic = false, items = []}: CreatePlaylistOptions<T> = {}
    ): Promise<MediaPlaylist> {
        const playlist = await this.api.createPlaylist(
            name,
            description,
            isPublic,
            items.map((item) => this.getIdFromSrc(item))
        );
        return {
            src: `${this.id}:playlist:${playlist.id}`,
            title: name,
            itemType: ItemType.Playlist,
            pager: new SimplePager(),
            trackCount: items.length,
        };
    }

    createSourceFromPin<T extends Pinnable>(pin: Pin): MediaSource<T> {
        if (pin.itemType !== ItemType.Playlist) {
            throw Error('Unsupported Pin type.');
        }
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const service = this;
        return {
            title: pin.title,
            itemType: pin.itemType,
            id: pin.src,
            sourceId: `${this.id}/pinned-playlist`,
            icon: 'pin',
            isPin: true,

            search(): Pager<T> {
                const id = service.getIdFromSrc(pin);
                return new SubsonicPager(
                    service,
                    ItemType.Playlist,
                    async (): Promise<Page<Subsonic.Playlist>> => {
                        const playlist = await service.api.getPlaylist(id);
                        return {items: [playlist], atEnd: true};
                    }
                );
            },
        };
    }

    async editPlaylist(playlist: MediaPlaylist): Promise<MediaPlaylist> {
        await this.api.editPlaylist(playlist);
        return playlist;
    }

    async getFilters(filterType: FilterType, itemType: ItemType): Promise<readonly MediaFilter[]> {
        return this.api.getFilters(filterType, itemType);
    }

    async addMetadata<T extends MediaObject>(item: T): Promise<T> {
        const itemType = item.itemType;
        const id = this.getIdFromSrc(item);
        if (item.synthetic) {
            return item;
        }
        if (itemType === ItemType.Media && item.linearType) {
            return item;
        }
        if (itemType === ItemType.Album) {
            if (item.description === undefined) {
                const info = await this.api.getAlbumInfo(id, item.subsonic?.isDir);
                item = {
                    ...item,
                    // These values sometimes come through as `{}` from Ampache.
                    description:
                        typeof info.notes === 'string' ? getTextFromHtml(info.notes) : undefined,
                    release_mbid:
                        item.release_mbid ||
                        (typeof info.musicBrainzId === 'string' ? info.musicBrainzId : undefined),
                };
            }
        } else if (itemType === ItemType.Artist && item.description === undefined) {
            const info = await this.api.getArtistInfo(id);
            item = {
                ...item,
                description: getTextFromHtml(info.biography),
                artist_mbid:
                    item.artist_mbid ||
                    (typeof info.musicBrainzId === 'string' ? info.musicBrainzId : undefined),
            };
        }
        if ((itemType === ItemType.Media || itemType === ItemType.Album) && !item.shareLink) {
            try {
                const shareLink = await this.api.createShare(id);
                item = {...item, shareLink};
            } catch (err) {
                this.logger.warn(err);
                this.logger.info('Could not create share link');
            }
        }
        if (item.inLibrary !== undefined && item.rating !== undefined) {
            return item;
        }
        if (itemType === ItemType.Album) {
            const album = await this.api.getAlbum(id);
            return {...item, inLibrary: !!album.starred, rating: album.userRating || 0};
        } else if (itemType === ItemType.Artist) {
            const artist = await this.api.getArtist(id);
            return {...item, inLibrary: !!artist.starred, rating: artist.userRating || 0};
        } else {
            const song = await this.api.getSong(id);
            return {...item, inLibrary: !!song.starred, rating: song.userRating || 0};
        }
    }

    async getPlaybackType(item: PlayableItem): Promise<PlaybackType> {
        return this.api.getPlaybackType(item);
    }

    getPlayableUrl(item: PlayableItem): string {
        return this.api.getPlayableUrl(item);
    }

    getServerInfo(): Promise<Record<string, string>> {
        return this.api.getServerInfo();
    }

    getThumbnailUrl(url: string): string {
        return url.replace(`{${this.id}-credentials}`, this.settings.credentials);
    }

    async lookup(
        artist: string,
        title: string,
        limit = 10,
        timeout?: number
    ): Promise<readonly MediaItem[]> {
        if (!artist || !title) {
            return [];
        }
        const options: Partial<PagerConfig> = {pageSize: limit, maxSize: limit, passive: true};
        const pager = new SubsonicPager<MediaItem>(
            this,
            ItemType.Media,
            async (offset: number, count: number): Promise<Page<Subsonic.Song>> => {
                const items = await this.api.searchSongs(`${artist} ${title}`, offset, count);
                return {items};
            },
            options
        );
        return fetchFirstPage(pager, {timeout});
    }

    async rate(item: MediaObject, rating: number): Promise<void> {
        if (!this.canRate(item)) {
            return;
        }
        const id = this.getIdFromSrc(item);
        await this.api.setRating(id, rating);
    }

    async store(item: MediaObject, inLibrary: boolean): Promise<void> {
        if (!this.canStore(item)) {
            return;
        }
        const method = inLibrary ? 'star' : 'unstar';
        const id = this.getIdFromSrc(item);
        switch (item.itemType) {
            case ItemType.Media:
                await this.api.get(method, {id});
                break;

            case ItemType.Album:
                await this.api.get(method, {albumId: id});
                break;

            case ItemType.Artist:
                await this.api.get(method, {artistId: id});
                break;
        }
    }

    scrobble(): void {
        subsonicScrobbler.scrobble(this, this.api);
    }

    private createSearch<T extends MediaObject>(
        itemType: T['itemType'],
        props: Except<MediaSource<T>, 'itemType' | 'icon' | 'search'>
    ): MediaSource<T> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const service = this;
        const api = this.api;

        return {
            ...props,
            itemType,
            id: `${this.id}/search/${props.id}`,
            icon: 'search',

            search({q = ''}: {q?: string} = {}): Pager<T> {
                q = q.trim();
                return new SubsonicPager(
                    service,
                    itemType,
                    async (offset: number, count: number) => {
                        switch (itemType) {
                            case ItemType.Media: {
                                const items = await (q
                                    ? api.searchSongs(q, offset, count)
                                    : api.getRandomSongs());
                                return {items};
                            }

                            case ItemType.Album: {
                                const items = await (q
                                    ? api.searchAlbums(q, offset, count)
                                    : api.getRandomAlbums());
                                return {items};
                            }

                            case ItemType.Artist: {
                                const items = await (q
                                    ? api.searchArtists(q, offset, count)
                                    : api.getRandomArtists());
                                return {items};
                            }

                            default:
                                throw TypeError('Search not supported for this type of media');
                        }
                    }
                );
            },
        };
    }

    private getIdFromSrc({src}: {src: string}): string {
        const [, , id] = src.split(':');
        return id;
    }
}
