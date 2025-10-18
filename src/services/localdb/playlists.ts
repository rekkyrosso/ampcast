import Dexie from 'dexie';
import {nanoid} from 'nanoid';
import {Except} from 'type-fest';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import Pager, {PagerConfig} from 'types/Pager';
import SortParams from 'types/SortParams';
import DexiePager from 'services/pagers/DexiePager';
import SimplePager from 'services/pagers/SimplePager';
import pinStore from 'services/pins/pinStore';

type LocalPlaylist = Except<MediaPlaylist, 'pager'>;

interface LocalPlaylistItems {
    readonly src: string;
    readonly items: readonly MediaItem[];
}

class PlaylistsStore extends Dexie {
    private readonly playlists!: Dexie.Table<LocalPlaylist, string>;
    private readonly playlistItems!: Dexie.Table<LocalPlaylistItems, string>;

    constructor() {
        super('ampcast/playlists');

        this.version(1).stores({
            playlists: '&src',
            playlistItems: '&src',
        });
    }

    async addToPlaylist({src}: {src: string}, items: readonly MediaItem[]): Promise<void> {
        const now = Math.floor(Date.now() / 1000);
        const playlist = await this.playlists.get(src);
        if (!playlist) {
            throw Error('Playlist not found');
        }
        const playlistItems = await this.playlistItems.get(src);
        items = playlistItems?.items.concat(items) || items;
        await this.playlistItems.put({src, items});
        await this.playlists.put({...playlist, trackCount: items.length, modifiedAt: now});
    }

    async createPlaylist<T extends MediaItem>(
        title: string,
        {description = '', items = []}: CreatePlaylistOptions<T> = {}
    ): Promise<MediaPlaylist> {
        const now = Math.floor(Date.now() / 1000);
        const playlist: LocalPlaylist = {
            itemType: ItemType.Playlist,
            src: `localdb:playlist:${nanoid()}`,
            title,
            description,
            trackCount: items.length,
            addedAt: now,
            modifiedAt: now,
        };
        await this.playlists.put(playlist);
        await this.playlistItems.put({src: playlist.src, items});
        return {...playlist, pager: new SimplePager(items)};
    }

    async deletePlaylist({src}: {src: string}): Promise<void> {
        await this.playlistItems.delete(src);
        await this.playlists.delete(src);
    }

    createPager(
        {
            filter,
            sort,
        }: {
            filter?: (playlist: LocalPlaylist) => boolean;
            sort?: (a: LocalPlaylist, b: LocalPlaylist) => number;
        } = {},
        options?: Partial<PagerConfig>
    ): Pager<MediaPlaylist> {
        let oldPlaylists: readonly MediaPlaylist[] = [];
        const createChildPager = (playlist: MediaPlaylist, itemSort?: SortParams) => {
            return new DexiePager(async () => {
                const playlistItems = await this.playlistItems.get(playlist.src);
                let items =
                    playlistItems?.items.map((item, index) => ({
                        ...item,
                        position: index + 1,
                    })) || [];
                if (itemSort) {
                    const {sortBy, sortOrder} = itemSort;
                    items = items.sort((a, b) => {
                        switch (sortBy) {
                            case 'title':
                                return (
                                    a.title.localeCompare(b.title, undefined, {
                                        sensitivity: 'base',
                                    }) * sortOrder
                                );
                            case 'artist':
                                return (
                                    String(a.artists || '').localeCompare(
                                        String(b.artists || ''),
                                        undefined,
                                        {sensitivity: 'base'}
                                    ) * sortOrder
                                );
                            default:
                                return (a.position || 0 - (b.position || 0)) * sortOrder;
                        }
                    });
                }
                return items;
            });
        };
        return new DexiePager(
            async () => {
                let newPlaylists = await this.playlists.toArray();
                if (filter) {
                    newPlaylists = newPlaylists.filter(filter);
                }
                if (sort) {
                    newPlaylists.sort(sort);
                }
                const oldPlaylistsMap = new Map(
                    oldPlaylists.map((playlist) => [playlist.src, playlist])
                );
                const newPlaylistsMap = new Map(
                    newPlaylists.map((playlist) => [playlist.src, playlist])
                );
                const removals = oldPlaylists.filter(
                    (oldPlaylist) => !newPlaylistsMap.has(oldPlaylist.src)
                );
                removals.forEach((playlist) => playlist.pager?.disconnect());
                oldPlaylists = newPlaylists.map((playlist) => ({
                    ...playlist,
                    isPinned: pinStore.isPinned(playlist.src),
                    pager:
                        oldPlaylistsMap.get(playlist.src)?.pager ||
                        createChildPager(playlist as MediaPlaylist),
                }));
                return oldPlaylists;
            },
            options,
            createChildPager
        );
    }
}

export default new PlaylistsStore();
