import type {Observable} from 'rxjs';
import {Except, SetOptional, Writable} from 'type-fest';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaFolder from 'types/MediaFolder';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaService from 'types/PersonalMediaService';
import PlayableItem from 'types/PlayableItem';
import Pin from 'types/Pin';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {getTextFromHtml} from 'utils';
import SubsonicPager from './SubsonicPager';
import SubsonicApi from './SubsonicApi';
import SubsonicSettings from './SubsonicSettings';
import LibraryAction from 'types/LibraryAction';
import SubsonicAuth from './SubsonicAuth';
import subsonicScrobbler from './subsonicScrobbler';
import FilterBrowser from 'components/MediaBrowser/FilterBrowser';
import FolderBrowser from 'components/MediaBrowser/FolderBrowser';

const playlistLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Blurb'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount'],
};

export default class SubsonicService implements PersonalMediaService {
    readonly id = this.serviceId;
    readonly api: SubsonicApi;
    readonly settings: SubsonicSettings;
    readonly serviceType = ServiceType.PersonalMedia;
    readonly defaultHidden = true;
    readonly icon = this.serviceId;
    readonly root: MediaMultiSource;
    readonly sources: PersonalMediaService['sources'];
    readonly labels: Partial<Record<LibraryAction, string>>;
    readonly editablePlaylists: MediaSource<MediaPlaylist>;
    readonly observeIsLoggedIn: (this: unknown) => Observable<boolean>;
    readonly isConnected: (this: unknown) => boolean;
    readonly isLoggedIn: (this: unknown) => boolean;
    readonly login: (this: unknown) => Promise<void>;
    readonly logout: (this: unknown) => Promise<void>;

    constructor(
        private readonly serviceId: MediaServiceId,
        readonly name: string,
        readonly url: string
    ) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const service = this;
        const settings = (this.settings = new SubsonicSettings(serviceId));
        const api = (this.api = new SubsonicApi(settings));
        const auth = new SubsonicAuth(this);

        this.observeIsLoggedIn = auth.observeIsLoggedIn.bind(auth);
        this.isConnected = auth.isConnected.bind(auth);
        this.isLoggedIn = auth.isLoggedIn.bind(auth);
        this.login = auth.login.bind(auth);
        this.logout = auth.logout.bind(auth);

        const search: MediaMultiSource = {
            id: `${serviceId}/search`,
            title: 'Search',
            icon: 'search',
            sources: [
                this.createSearch<MediaItem>(ItemType.Media, {title: 'Songs'}),
                this.createSearch<MediaAlbum>(ItemType.Album, {title: 'Albums'}),
                this.createSearch<MediaArtist>(ItemType.Artist, {title: 'Artists'}),
            ],
        };

        const likedSongs: MediaSource<MediaItem> = {
            id: `${serviceId}/liked-songs`,
            title: 'My Songs',
            icon: 'heart',
            itemType: ItemType.Media,
            lockActionsStore: true,
            layout: {
                view: 'card',
                fields: ['Thumbnail', 'Artist', 'Title', 'AlbumAndYear', 'Duration'],
            },

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
            id: `${serviceId}/liked-albums`,
            title: 'My Albums',
            icon: 'heart',
            itemType: ItemType.Album,
            lockActionsStore: true,

            search(): Pager<MediaAlbum> {
                return new SubsonicPager(
                    service,
                    ItemType.Album,
                    async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                        const items = await api.getLikedAlbums(offset, count);
                        return {items};
                    }
                );
            },
        };

        const recentlyPlayed: MediaSource<MediaAlbum> = {
            id: `${serviceId}/recently-played`,
            title: 'Recently Played',
            icon: 'clock',
            itemType: ItemType.Album,

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
            id: `${serviceId}/most-played`,
            title: 'Most Played',
            icon: 'most-played',
            itemType: ItemType.Album,
            layout: {
                view: 'card compact',
                fields: ['Thumbnail', 'Title', 'Artist', 'Year', 'PlayCount'],
            },
            secondaryLayout: {
                view: 'details',
                fields: ['Index', 'Title', 'Artist', 'Duration', 'PlayCount'],
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
            id: `${serviceId}/playlists`,
            title: 'Playlists',
            icon: 'playlist',
            itemType: ItemType.Playlist,
            layout: playlistLayout,
            secondaryLayout: playlistItemsLayout,

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
            id: `${serviceId}/tracks-by-genre`,
            title: 'Songs by Genre',
            icon: 'genre',
            itemType: ItemType.Media,
            filterType: FilterType.ByGenre,
            component: FilterBrowser,
            defaultHidden: true,
            layout: {
                view: 'details',
                fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount'],
            },

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
            id: `${serviceId}/albums-by-genre`,
            title: 'Albums by Genre',
            icon: 'genre',
            itemType: ItemType.Album,
            filterType: FilterType.ByGenre,
            component: FilterBrowser,

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
            id: `${serviceId}/albums-by-decade`,
            title: 'Albums by Decade',
            icon: 'calendar',
            itemType: ItemType.Album,
            filterType: FilterType.ByDecade,
            component: FilterBrowser,

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
            id: `${serviceId}/random-tracks`,
            title: 'Random Songs',
            icon: 'shuffle',
            itemType: ItemType.Media,
            layout: {
                view: 'card',
                fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
            },

            search(): Pager<MediaItem> {
                return new SubsonicPager(service, ItemType.Media, async () => {
                    const items = await api.getRandomSongs(100);
                    return {items, atEnd: true};
                });
            },
        };

        const randomAlbums: MediaSource<MediaAlbum> = {
            id: `${serviceId}/random-albums`,
            title: 'Random Albums',
            icon: 'shuffle',
            itemType: ItemType.Album,

            search(): Pager<MediaAlbum> {
                return new SubsonicPager(service, ItemType.Album, async () => {
                    const items = await api.getRandomAlbums(100);
                    return {items, atEnd: true};
                });
            },
        };

        const musicVideos: MediaSource<MediaItem> = {
            id: `${serviceId}/videos`,
            title: 'Music Videos',
            icon: 'video',
            itemType: ItemType.Media,
            mediaType: MediaType.Video,
            defaultHidden: true,
            layout: {
                view: 'card compact',
                fields: ['Thumbnail', 'Title', 'Duration'],
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

        const folders: MediaSource<MediaFolderItem> = {
            id: `${serviceId}/folders`,
            title: 'Folders',
            icon: 'folder',
            itemType: ItemType.Folder,
            component: FolderBrowser,

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
                                src: `${serviceId}:folder:${id}`,
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
            recentlyPlayed,
            mostPlayed,
            playlists,
            tracksByGenre,
            albumsByGenre,
            albumsByDecade,
            randomTracks,
            randomAlbums,
            musicVideos,
            folders,
        ];

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

    canRate(): boolean {
        return false;
    }

    canStore<T extends MediaObject>(item: T): boolean {
        switch (item.itemType) {
            case ItemType.Media:
                return true;

            case ItemType.Album:
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
            src: `${this.serviceId}:playlist:${playlist.id}`,
            title: name,
            itemType: ItemType.Playlist,
            pager: new SimplePager(),
        };
    }

    createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const service = this;
        return {
            title: pin.title,
            itemType: ItemType.Playlist,
            layout: {
                view: 'card',
                fields: ['Thumbnail', 'PlaylistTitle', 'TrackCount', 'Blurb'],
            },
            id: pin.src,
            icon: 'pin',
            isPin: true,

            search(): Pager<MediaPlaylist> {
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

    async getFilters(filterType: FilterType, itemType: ItemType): Promise<readonly MediaFilter[]> {
        return this.api.getFilters(filterType, itemType);
    }

    async getMetadata<T extends MediaObject>(item: T): Promise<T> {
        const itemType = item.itemType;
        const id = this.getIdFromSrc(item);
        if (itemType === ItemType.Album) {
            if (item.synthetic) {
                return item;
            }
            if (item.description === undefined) {
                const info = await this.api.getAlbumInfo(id, item.subsonic?.isDir);
                item = {
                    ...item,
                    description: getTextFromHtml(info.notes),
                    release_mbid: info.musicBrainzId,
                };
            }
        } else if (itemType === ItemType.Artist && item.description === undefined) {
            const info = await this.api.getArtistInfo(id);
            item = {
                ...item,
                description: getTextFromHtml(info.biography),
                artist_mbid: info.musicBrainzId,
            };
        }
        if (!this.canStore(item) || item.inLibrary !== undefined) {
            return item;
        }
        const inLibrary = actionsStore.getInLibrary(item);
        if (inLibrary !== undefined) {
            return {...item, inLibrary};
        }
        if (itemType === ItemType.Album) {
            const id = await this.getAlbumDirectoryId(item);
            const directory = await this.api.getMusicDirectory(id);
            return {...item, inLibrary: !!directory.starred};
        } else {
            const song = await this.api.getSong(id);
            return {...item, inLibrary: !!song.starred};
        }
    }

    getPlayableUrl(item: PlayableItem): string {
        return this.api.getPlayableUrl(item);
    }

    getThumbnailUrl(url: string): string {
        return url.replace(`{${this.serviceId}-credentials}`, this.settings.credentials);
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
        const options: Partial<PagerConfig> = {pageSize: limit, maxSize: limit, lookup: true};
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

    async store(item: MediaObject, inLibrary: boolean): Promise<void> {
        const method = inLibrary ? 'star' : 'unstar';
        switch (item.itemType) {
            case ItemType.Media: {
                const [, , id] = item.src.split(':');
                await this.api.get(method, {id});
                break;
            }

            case ItemType.Album: {
                // To stay in synch with the subsonic UI, we'll add likes to the directory rather than the album.
                const id = await this.getAlbumDirectoryId(item);
                await this.api.get(method, {id});
                break;
            }
        }
    }

    scrobble(): void {
        subsonicScrobbler.scrobble(this, this.api);
    }

    private createSearch<T extends MediaObject>(
        itemType: T['itemType'],
        props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
    ): MediaSource<T> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const service = this;
        const api = this.api;

        return {
            ...props,
            itemType,
            id: props.title,
            icon: 'search',
            searchable: true,

            search({q = ''}: {q?: string} = {}): Pager<T> {
                q = q.trim();
                if (q) {
                    return new SubsonicPager(
                        service,
                        itemType,
                        async (offset: number, count: number) => {
                            switch (itemType) {
                                case ItemType.Media: {
                                    const items = await api.searchSongs(q, offset, count);
                                    return {items};
                                }

                                case ItemType.Album: {
                                    const items = await api.searchAlbums(q, offset, count);
                                    return {items};
                                }

                                case ItemType.Artist: {
                                    const items = await api.searchArtists(q, offset, count);
                                    return {items};
                                }

                                default:
                                    throw TypeError('Search not supported for this type of media');
                            }
                        }
                    );
                } else {
                    return new SimplePager();
                }
            },
        };
    }

    private async getAlbumDirectoryId(album: MediaAlbum): Promise<string> {
        const id = this.getIdFromSrc(album);
        if (album.subsonic?.isDir) {
            return id;
        }
        const [{parent}] = await this.api.getAlbumTracks(id);
        return parent || '';
    }

    private getIdFromSrc({src}: {src: string}): string {
        const [, , id] = src.split(':');
        return id;
    }
}
