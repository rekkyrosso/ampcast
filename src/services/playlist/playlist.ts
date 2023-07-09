import type {Observable} from 'rxjs';
import {
    BehaviorSubject,
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
    mergeMap,
    skip,
    tap,
} from 'rxjs';
import {get as dbRead, set as dbWrite, createStore} from 'idb-keyval';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import Playlist from 'types/Playlist';
import PlaylistItem from 'types/PlaylistItem';
import LookupStatus from 'types/LookupStatus';
import {createMediaItemFromFile} from 'services/file';
import {
    LookupStartEvent,
    LookupEndEvent,
    observeLookupStartEvents,
    observeLookupEndEvents,
} from 'services/lookup';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {exists, shuffle as shuffleArray, Logger} from 'utils';
import {removeUserData} from 'utils/media';
import settings from './playlistSettings';

const logger = new Logger('playlist');

type PlayableType =
    | MediaAlbum
    | MediaItem
    | File
    | FileList
    | readonly MediaAlbum[]
    | readonly MediaItem[]
    | readonly File[];

const delayWriteTime = 200;

const playlistStore = createStore('ampcast/playlist', 'keyval');

const UNINITIALIZED: PlaylistItem[] = [];
const items$ = new BehaviorSubject<PlaylistItem[]>(UNINITIALIZED);
const currentItemId$ = new BehaviorSubject('');

function getItems(): PlaylistItem[] {
    return items$.getValue();
}

function setItems(items: PlaylistItem[]): void {
    items = items.concat(); // make sure we get a new array
    items$.next(items);
    if (items.length === 0) {
        setCurrentItemId('');
    } else {
        const currentItem = getCurrentItem();
        if (!currentItem) {
            // make sure something is selected.
            setCurrentItemId(items[0].id);
        }
    }
}

export function observe(): Observable<readonly PlaylistItem[]> {
    return items$.pipe(filter((items) => items !== UNINITIALIZED));
}

function getCurrentItemId(): string {
    return currentItemId$.getValue();
}

function setCurrentItemId(id: string): void {
    currentItemId$.next(id);
}

export function getCurrentItem(): PlaylistItem | null {
    const items = getItems();
    const currentItemId = getCurrentItemId();
    return items.find((item) => item.id === currentItemId) || null;
}

export function setCurrentItem(item: PlaylistItem): void {
    setCurrentItemId(item.id);
}

export function observeCurrentItem(): Observable<PlaylistItem | null> {
    return combineLatest([items$, currentItemId$]).pipe(
        map(([items, id]) => items.find((item) => item.id === id) ?? null),
        distinctUntilChanged()
    );
}

export function observeNextItem(): Observable<PlaylistItem | null> {
    return combineLatest([items$, currentItemId$]).pipe(
        map(([items, id]) => {
            const index = items.findIndex((item) => item.id === id);
            if (index === -1) {
                return null;
            }
            return items[index + 1] || null;
        }),
        distinctUntilChanged()
    );
}

export function observeCurrentIndex(): Observable<number> {
    return combineLatest([items$, currentItemId$]).pipe(
        map(([items, id]) => items.findIndex((item) => item.id === id)),
        distinctUntilChanged()
    );
}

export function getCurrentIndex(): number {
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

function moveCurrentIndexBy(amount: -1 | 1): void {
    const currentItemId = getCurrentItemId();
    if (currentItemId) {
        const items = getItems();
        const index = items.findIndex((item) => item.id === currentItemId);
        if (index !== -1) {
            const nextItem = items[index + amount];
            if (nextItem) {
                setCurrentItem(nextItem);
            }
        }
    }
}

export async function add(items: PlayableType): Promise<void> {
    return insertAt(items, -1);
}

export async function clear(): Promise<void> {
    setItems([]);
}

export async function eject(): Promise<void> {
    const item = getCurrentItem();
    if (item) {
        return remove(item);
    }
}

function getAt(index: number): PlaylistItem | null {
    const items = getItems();
    return items[index] ?? null;
}

export async function insert(items: PlayableType): Promise<void> {
    return insertAt(items, getCurrentIndex() + 1);
}

export async function insertAt(items: PlayableType, index: number): Promise<void> {
    const all = getItems();
    const allowDuplicates = settings.get().allowDuplicates;
    let additions = await createMediaItems(items);
    if (!allowDuplicates) {
        additions = additions.filter((addition) => {
            return all.findIndex((item) => item.src === addition.src) === -1;
        });
    }
    if (additions.length > 0) {
        const newItems = additions.map((item) => ({
            ...removeUserData(item),
            id: nanoid(),
        }));
        if (index >= 0 && index < all.length) {
            // insert
            all.splice(index, 0, ...newItems);
            setItems(all);
        } else {
            // append
            setItems(all.concat(newItems));
        }
    }
}

export async function moveSelection(selection: PlaylistItem[], beforeIndex: number): Promise<void> {
    const items = getItems();
    const insertBeforeItem = items[beforeIndex];
    if (selection.includes(insertBeforeItem)) {
        // selection hasn't moved
        return;
    }
    const newItems = items.filter((item) => !selection.includes(item));
    const insertAtIndex = newItems.indexOf(insertBeforeItem);
    if (insertAtIndex >= 0) {
        newItems.splice(insertAtIndex, 0, ...selection);
        setItems(newItems);
    } else {
        setItems(newItems.concat(selection));
    }
}

export async function next(): Promise<void> {
    moveCurrentIndexBy(+1);
}

export async function prev(): Promise<void> {
    moveCurrentIndexBy(-1);
}

export async function remove(item: PlaylistItem | readonly PlaylistItem[]): Promise<void> {
    const items = getItems();
    const removals = Array.isArray(item) ? item : [item];
    const newItems = items.filter((item) => !removals.includes(item));
    if (newItems.length !== items.length) {
        const currentIndex = getCurrentIndex();
        const currentlyPlayingId = getCurrentItemId();
        const index = newItems.findIndex((item) => item.id === currentlyPlayingId);
        if (index === -1) {
            if (currentIndex === -1) {
                setCurrentItemId('');
            } else {
                const newCurrentItem = newItems[currentIndex] || newItems.at(-1);
                setCurrentItemId(newCurrentItem?.id || '');
            }
        }
        setItems(newItems);
    }
}

export async function removeAt(index: number): Promise<void> {
    const item = getAt(index);
    if (item) {
        return remove(item);
    }
}

export async function reverseAt(index: number, length: number): Promise<void> {
    const items = getItems();
    const reversals = items.slice(index, index + length).reverse();
    items.splice(index, length, ...reversals);
    setItems(items);
}

export async function shuffle(preserveCurrentlyPlaying?: boolean): Promise<void> {
    const currentItems = getItems().slice();
    if (currentItems.length > 0) {
        const currentItem = getCurrentItem();
        if (preserveCurrentlyPlaying && currentItem) {
            const items = shuffleArray(currentItems.filter((item) => item !== currentItem));
            items.unshift(currentItem);
            setItems(items);
        } else {
            const items = shuffleArray(currentItems);
            setItems(items);
            setCurrentItem(items[0]);
        }
    }
}

async function createMediaItems(source: PlayableType): Promise<readonly MediaItem[]> {
    const isAlbum = (album: PlayableType): album is MediaAlbum => {
        return 'itemType' in album && album.itemType === ItemType.Album;
    };
    let items: readonly (MediaItem | null)[] = [];
    if (Array.isArray(source)) {
        if (isAlbum(source[0])) {
            const albums = await Promise.all(
                source.map((album) => createMediaItemsFromAlbum(album))
            );
            for (const album of albums) {
                items = items.concat(album);
            }
        } else {
            items = await Promise.all(source.map((item) => createMediaItem(item)));
        }
    } else if (isAlbum(source)) {
        items = await createMediaItemsFromAlbum(source);
    } else {
        if (source instanceof FileList) {
            items = await Promise.all(
                Array.from(source).map((file) => createMediaItemFromFile(file))
            );
        } else {
            items = [await createMediaItem(source as File | MediaItem)];
        }
    }
    return items.filter(exists);
}

async function createMediaItemsFromAlbum(album: MediaAlbum): Promise<readonly MediaItem[]> {
    return fetchFirstPage(album.pager, {keepAlive: true});
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
    observeCurrentIndex,
    observeCurrentItem,
    observeNextItem,
    observeSize,
    getCurrentIndex,
    getCurrentItem,
    setCurrentItem,
    add,
    clear,
    eject,
    insert,
    insertAt,
    moveSelection,
    next,
    prev,
    remove,
    removeAt,
    reverseAt,
    shuffle,
};

export default playlist;

(async () => {
    const items = (await dbRead<PlaylistItem[]>('items', playlistStore)) ?? [];
    const id = (await dbRead('currently-playing-id', playlistStore)) ?? '';
    items$.next(items);
    currentItemId$.next(id);
})();

items$
    .pipe(
        skip(2),
        debounceTime(delayWriteTime),
        mergeMap((items: PlaylistItem[]) => {
            items = items.map((item) => {
                if (item.lookupStatus) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {lookupStatus, ...rest} = item;
                    return rest;
                }
                return item;
            });
            return dbWrite('items', items, playlistStore);
        })
    )
    .subscribe(logger);

currentItemId$
    .pipe(
        skip(2),
        debounceTime(delayWriteTime),
        mergeMap((id) => dbWrite('currently-playing-id', id, playlistStore))
    )
    .subscribe(logger);

observeLookupStartEvents()
    .pipe(
        tap(({lookupItem}: LookupStartEvent) => {
            const items = getItems();
            const index = items.findIndex((item) => item.src === lookupItem.src);
            if (index !== -1) {
                const item = items[index];
                items[index] = {...item, lookupStatus: LookupStatus.Looking};
                setItems(items);
            }
        })
    )
    .subscribe(logger);

observeLookupEndEvents()
    .pipe(
        tap(({lookupItem, foundItem}: LookupEndEvent) => {
            const items = getItems();
            const index = items.findIndex((item) => item.src === lookupItem.src);
            if (index !== -1) {
                const item = items[index];
                items[index] = foundItem
                    ? {...foundItem, id: item.id, lookupStatus: undefined}
                    : {...item, lookupStatus: LookupStatus.NotFound};
                setItems(items);
            }
        })
    )
    .subscribe(logger);
