import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, map, withLatestFrom} from 'rxjs/operators';
import {get as dbRead, set as dbWrite, createStore} from 'idb-keyval';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import Playlist from 'types/Playlist';
import PlaylistItem from 'types/PlaylistItem';
import {createMediaItemFromFile} from 'services/file';
import {exists, fetchFirstPage} from 'utils';
import settings from './playlistSettings';

console.log('module::playlist');

type PlaylistSource =
    | MediaAlbum
    | MediaItem
    | File
    | FileList
    | readonly MediaAlbum[]
    | readonly MediaItem[]
    | readonly File[];

const store = createStore('ampcast/playlist', 'keyval');

const UNINITIALIZED: PlaylistItem[] = [];
const items$ = new BehaviorSubject<PlaylistItem[]>(UNINITIALIZED);
const currentItemId$ = new BehaviorSubject('');

async function getAll(): Promise<PlaylistItem[]> {
    if (items$.getValue() === UNINITIALIZED) {
        const items = (await dbRead<PlaylistItem[]>('items', store)) ?? [];
        items$.next(items);
    }
    return items$.getValue();
}

async function setAll(items: PlaylistItem[]): Promise<void> {
    items = items.concat(); // make sure we get a new array
    await dbWrite('items', items, store);
    items$.next(items);
    if (items.length !== 0) {
        const currentItemId = getCurrentItemId();
        if (!currentItemId) {
            // make sure something is selected.
            setCurrentItemId(items[0].id);
        }
    }
}

export function observe(): Observable<PlaylistItem[]> {
    return items$;
}

function getCurrentItemId(): string {
    return currentItemId$.getValue();
}

async function setCurrentItemId(id: string): Promise<void> {
    await dbWrite('currently-playing-id', id, store);
    currentItemId$.next(id);
}

export async function getCurrentItem(): Promise<PlaylistItem | null> {
    const currentItemId = getCurrentItemId();
    if (currentItemId) {
        const items = await getAll();
        const item = items.find((item) => item.id === currentItemId);
        return item || null;
    }
    return null;
}

export async function setCurrentItem(item: PlaylistItem): Promise<void> {
    await setCurrentItemId(item.id);
}

export function observeCurrentItem(): Observable<PlaylistItem | null> {
    return currentItemId$.pipe(
        withLatestFrom(items$),
        map(([id, items]) => items.find((item) => item.id === id) ?? null),
        distinctUntilChanged()
    );
}

export function observeCurrentIndex(): Observable<number> {
    return currentItemId$.pipe(
        withLatestFrom(items$),
        map(([id, items]) => items.findIndex((item) => item.id === id)),
        distinctUntilChanged()
    );
}

function getCurrentIndex(): number {
    const items = items$.getValue();
    const currentItemId = getCurrentItemId();
    return items.findIndex((item) => item.id === currentItemId);
}

export function observeSize(): Observable<number> {
    return items$.pipe(
        map((items) => items.length),
        distinctUntilChanged()
    );
}

function getSize(): number {
    return items$.getValue().length;
}

async function moveCurrentIndexBy(amount: -1 | 1): Promise<void> {
    const currentItemId = getCurrentItemId();
    if (currentItemId) {
        const items = await getAll();
        const index = items.findIndex((item) => item.id === currentItemId);
        if (index !== -1) {
            const nextItem = items[index + amount];
            if (nextItem) {
                await setCurrentItem(nextItem);
            }
        }
    }
}

export async function add(items: PlaylistSource): Promise<void> {
    await insertAt(items, -1);
}

export async function clear(): Promise<void> {
    await setAll([]);
}

async function getAt(index: number): Promise<PlaylistItem | null> {
    const items = await getAll();
    return items[index] ?? null;
}

export async function get(id: string): Promise<PlaylistItem | null> {
    const items = await getAll();
    return items.find((item) => item.id === id) ?? null;
}

export async function insertAt(items: PlaylistSource, index: number): Promise<void> {
    const all = await getAll();
    const allowDuplicates = settings.get().allowDuplicates;
    let additions = await createMediaItems(items);
    if (!allowDuplicates) {
        additions = additions.filter((addition) => {
            return all.findIndex((item) => item.src === addition.src) === -1;
        });
    }
    if (additions.length > 0) {
        const newItems = additions.map((item) => ({...item, id: nanoid()}));
        if (index >= 0 && index < all.length) {
            // insert
            all.splice(index, 0, ...newItems);
            await setAll(all);
        } else {
            // append
            await setAll(all.concat(newItems));
        }
    }
}

export async function moveSelection(selection: PlaylistItem[], beforeIndex: number): Promise<void> {
    const items = await getAll();
    const insertBeforeItem = items[beforeIndex];
    if (selection.includes(insertBeforeItem)) {
        // selection hasn't moved
        return;
    }
    const newItems = items.filter((item) => !selection.includes(item));
    const insertAtIndex = newItems.indexOf(insertBeforeItem);
    if (insertAtIndex >= 0) {
        newItems.splice(insertAtIndex, 0, ...selection);
        await setAll(newItems);
    } else {
        await setAll(newItems.concat(selection));
    }
}

export async function next(): Promise<void> {
    await moveCurrentIndexBy(+1);
}

export async function prev(): Promise<void> {
    await moveCurrentIndexBy(-1);
}

export async function remove(item: PlaylistItem | readonly PlaylistItem[]): Promise<void> {
    const items = await getAll();
    const removals = Array.isArray(item) ? item : [item];
    const newItems = items.filter((item) => !removals.includes(item));
    if (newItems.length !== items.length) {
        const currentlyPlayingId = getCurrentItemId();
        const index = newItems.findIndex((item) => item.id === currentlyPlayingId);
        if (index === -1) {
            await setCurrentItemId('');
        }
        await setAll(newItems);
    }
}

export async function removeAt(index: number): Promise<void> {
    const item = await getAt(index);
    if (item) {
        await remove(item);
    }
}

export async function shuffle(): Promise<void> {
    // https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array#6274398
    const items = await getAll();
    let counter = items.length;
    while (counter > 0) {
        const index = Math.floor(Math.random() * counter);
        counter--;
        const item = items[counter];
        items[counter] = items[index];
        items[index] = item;
    }
    await setAll(items);
}

async function createMediaItems(source: PlaylistSource): Promise<readonly MediaItem[]> {
    const isAlbum = (album: PlaylistSource): album is MediaAlbum => {
        return 'itemType' in album && album.itemType === ItemType.Album;
    };
    let items: readonly (MediaItem | null)[] = [];
    if (Array.isArray(source)) {
        if (isAlbum(source[0])) {
            const albums = await Promise.all(source.map(createMediaItemsFromAlbum));
            for (const album of albums) {
                items = items.concat(album);
            }
        } else {
            items = await Promise.all(source.map(createMediaItem));
        }
    } else if (isAlbum(source)) {
        items = await createMediaItemsFromAlbum(source);
    } else {
        if (source instanceof FileList) {
            items = await Promise.all(Array.from(source).map(createMediaItemFromFile));
        } else {
            items = [await createMediaItem(source as File | MediaItem)];
        }
    }
    return items.filter(exists).map(createPlayableMediaItem);
}

function createPlayableMediaItem(item: MediaItem): MediaItem {
    const [source] = item.src.split(':');
    switch (source) {
        case 'lastfm':
        case 'listenbrainz':
        case 'musicbrainz':
            if (item.playableSrc) {
                return {...item, src: item.playableSrc};
            }
    }
    return item;
}

async function createMediaItemsFromAlbum(album: MediaAlbum): Promise<readonly MediaItem[]> {
    return fetchFirstPage(album.pager);
}

async function createMediaItem(item: File | MediaItem): Promise<MediaItem | null> {
    if (item instanceof File) {
        if (/^(audio|video)/.test(item.type)) {
            return createMediaItemFromFile(item);
        } else {
            return null;
        }
    } else {
        return item;
    }
}

const playlist: Playlist = {
    get atEnd(): boolean {
        return getCurrentIndex() === getSize() - 1;
    },
    get atStart(): boolean {
        return getSize() === 0 || getCurrentIndex() === 0;
    },
    observe,
    observeCurrentItem,
    observeCurrentIndex,
    observeSize,
    getCurrentItem,
    setCurrentItem,
    add,
    clear,
    insertAt,
    moveSelection,
    next,
    prev,
    remove,
    removeAt,
    shuffle,
};

export default playlist;

(async () => {
    await getAll();
    const id = (await dbRead('currently-playing-id', store)) ?? '';
    currentItemId$.next(id);
})();
