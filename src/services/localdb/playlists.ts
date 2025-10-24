import Dexie from 'dexie';
import {nanoid} from 'nanoid';
import {Except} from 'type-fest';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import Pager, {PagerConfig} from 'types/Pager';
import SortParams from 'types/SortParams';
import UserData from 'types/UserData';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {removeUserData} from 'services/metadata';
import DexiePager from 'services/pagers/DexiePager';
import SimplePager from 'services/pagers/SimplePager';
import pinStore from 'services/pins/pinStore';

export type LocalPlaylist = Except<MediaPlaylist, 'pager'>;

export type LocalPlaylistItem = Subtract<MediaItem, UserData> & {
    readonly id: string;
};

interface LocalPlaylistItems {
    readonly src: string;
    readonly items: readonly LocalPlaylistItem[];
}

class PlaylistsStore extends Dexie {
    private readonly playlists!: Dexie.Table<LocalPlaylist, string>;
    private readonly playlistItems!: Dexie.Table<LocalPlaylistItems, string>;

    constructor() {
        super('ampcast/playlists');

        this.version(1).stores({
            playlists: '&src, title',
            playlistItems: '&src',
        });
    }

    async addToPlaylist(
        {src}: {src: string},
        additions: readonly MediaItem[],
        position = -1 // append
    ): Promise<void> {
        const timeStamp = Math.floor(Date.now() / 1000);
        const playlist = await this.playlists.get(src);
        if (!playlist) {
            throw Error('Playlist not found');
        }
        const newItems = additions.map((item) => this.createLocalPlaylistItem(item));
        let items = (await this.playlistItems.get(src))?.items || [];
        if (position >= 0 && position < items.length) {
            (items as LocalPlaylistItem[]).splice(position, 0, ...newItems);
        } else {
            items = items.concat(newItems);
        }
        // Do this sequentially.
        await this.playlistItems.put({src, items});
        await this.playlists.put({...playlist, trackCount: items.length, modifiedAt: timeStamp});
    }

    async createPlaylist<T extends MediaItem>(
        name: string,
        {description, items = [], overWrite}: CreatePlaylistOptions<T> = {}
    ): Promise<MediaPlaylist> {
        const timeStamp = Math.floor(Date.now() / 1000);
        let src = `localdb:playlist:${nanoid()}`;
        if (overWrite) {
            const playlist = await this.getLocalPlaylistByName(name);
            if (playlist) {
                src = playlist.src;
            }
        }
        const playlist: LocalPlaylist = {
            itemType: ItemType.Playlist,
            src,
            title: name,
            description,
            trackCount: items.length,
            addedAt: timeStamp,
            modifiedAt: timeStamp,
            editable: true,
            deletable: true,
            items: {
                deletable: true,
                droppable: true,
                droppableTypes: ['text/x-spotify-tracks', 'text/uri-list', 'text/plain'],
                moveable: true,
            },
        };
        const playlistItems = items.map((item) => this.createLocalPlaylistItem(item));
        // Do this sequentially.
        await this.playlists.put(playlist);
        await this.playlistItems.put({src: playlist.src, items: playlistItems});
        return {...playlist, pager: new SimplePager(playlistItems)};
    }

    async deletePlaylist({src}: {src: string}): Promise<void> {
        // Do this sequentially.
        await this.playlistItems.delete(src);
        await this.playlists.delete(src);
    }

    async hasPlaylist(name: string): Promise<boolean> {
        const playlist = await this.getLocalPlaylistByName(name);
        return !!playlist;
    }

    async movePlaylistItems(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        {pager, ...playlist}: MediaPlaylist,
        itemsToMove: readonly LocalPlaylistItem[],
        beforeIndex: number
    ): Promise<void> {
        const timeStamp = Math.floor(Date.now() / 1000);
        const src = playlist.src;
        const idsToMove = itemsToMove.map((item) => item.id);
        const playlistItems = await this.playlistItems.get(src);
        const insertBeforeItem = playlistItems!.items[beforeIndex];
        if (idsToMove.includes(insertBeforeItem?.id)) {
            // selection hasn't moved
            return;
        }
        const items = playlistItems!.items.filter((item) => !idsToMove.includes(item.id));
        const insertAtIndex = items.indexOf(insertBeforeItem);
        if (insertAtIndex >= 0) {
            items.splice(insertAtIndex, 0, ...itemsToMove);
        } else {
            items.push(...itemsToMove);
        }
        // Do this sequentially.
        await this.playlistItems.put({src, items});
        await this.playlists.put({...playlist, modifiedAt: timeStamp});
    }

    async removePlaylistItems(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        {pager, ...playlist}: MediaPlaylist,
        itemsToRemove: readonly LocalPlaylistItem[]
    ): Promise<void> {
        const timeStamp = Math.floor(Date.now() / 1000);
        const src = playlist.src;
        const playlistItems = await this.playlistItems.get(src);
        const idsToMove = itemsToRemove.map((item) => item.id);
        const items = playlistItems?.items.filter((item) => !idsToMove.includes(item.id)) || [];
        // Do this sequentially.
        await this.playlistItems.put({src, items});
        await this.playlists.put({...playlist, trackCount: items.length, modifiedAt: timeStamp});
    }

    private createLocalPlaylistItem(item: MediaItem): LocalPlaylistItem {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {blob, blobUrl, unplayable, ...localPlaylistItem} = removeUserData(item);
        return {...localPlaylistItem, id: nanoid()};
    }

    private getLocalPlaylistByName(name: string): Promise<LocalPlaylist | undefined> {
        return this.playlists.where('title').equals(name).first();
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
            return new DexiePager<MediaItem>(
                async () => {
                    const playlistItems = await this.playlistItems.get(playlist.src);
                    const items =
                        playlistItems?.items.map((item, index) => ({
                            ...item,
                            position: index + 1,
                        })) || [];
                    if (itemSort) {
                        const {sortBy, sortOrder} = itemSort;
                        items.sort((a, b) => {
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
                                    return ((a.position || 0) - (b.position || 0)) * sortOrder;
                            }
                        });
                    }
                    return items;
                },
                {ignoreMetadataChanges: true}
            );
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
                oldPlaylists = newPlaylists.map((playlist) => {
                    const oldPager = oldPlaylistsMap.get(playlist.src)
                        ?.pager as DexiePager<MediaItem>;
                    const pager =
                        oldPager && !oldPager.disconnected
                            ? oldPager
                            : createChildPager(
                                  playlist as MediaPlaylist,
                                  getSourceSorting(options?.childSortId || '') || options?.childSort
                              );
                    if (oldPager?.connected && oldPager.disconnected) {
                        pager.fetchAt();
                    }
                    return {
                        ...playlist,
                        isPinned: pinStore.isPinned(playlist.src),
                        pager,
                    };
                });
                return oldPlaylists;
            },
            options,
            createChildPager
        );
    }
}

export default new PlaylistsStore();
