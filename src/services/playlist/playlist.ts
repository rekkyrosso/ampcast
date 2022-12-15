import type {Observable} from 'rxjs';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {debounceTime, distinctUntilChanged, filter, map, mergeMap, skip, tap} from 'rxjs/operators';
import {get as dbRead, set as dbWrite, createStore} from 'idb-keyval';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import Playlist from 'types/Playlist';
import PlaylistItem from 'types/PlaylistItem';
import {createMediaItemFromFile} from 'services/file';
import {LookupEvent, observeLookupEvents} from 'services/lookup/lookupEvents';
import {hasPlayableSrc} from 'services/mediaServices';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {exists, Logger} from 'utils';
import settings from './playlistSettings';

console.log('module::playlist');

const logger = new Logger('playlist');

type PlaylistSource =
    | MediaAlbum
    | MediaItem
    | File
    | FileList
    | readonly MediaAlbum[]
    | readonly MediaItem[]
    | readonly File[];

const delayWriteTime = 200;

const store = createStore('ampcast/playlist', 'keyval');

const UNINITIALIZED: PlaylistItem[] = [];
const items$ = new BehaviorSubject<PlaylistItem[]>(UNINITIALIZED);
const currentItemId$ = new BehaviorSubject('');

function getItems(): PlaylistItem[] {
    return items$.getValue();
}

function setItems(items: PlaylistItem[]): void {
    items = items.concat(); // make sure we get a new array
    items$.next(items);
    if (items.length !== 0) {
        const currentItemId = getCurrentItemId();
        if (!currentItemId) {
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
    const currentItemId = getCurrentItemId();
    if (currentItemId) {
        const items = getItems();
        const item = items.find((item) => item.id === currentItemId);
        return item || null;
    }
    return null;
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

export async function add(items: PlaylistSource): Promise<void> {
    await insertAt(items, -1);
}

export function clear(): void {
    setItems([]);
}

export function eject(): void {
    const item = getCurrentItem();
    if (item) {
        remove(item);
    }
}

function getAt(index: number): PlaylistItem | null {
    const items = getItems();
    return items[index] ?? null;
}

export async function insertAt(items: PlaylistSource, index: number): Promise<void> {
    const all = getItems();
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
            setItems(all);
        } else {
            // append
            setItems(all.concat(newItems));
        }
    }
}

export function moveSelection(selection: PlaylistItem[], beforeIndex: number): void {
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

export function next(): void {
    moveCurrentIndexBy(+1);
}

export function prev(): void {
    moveCurrentIndexBy(-1);
}

export function remove(item: PlaylistItem | readonly PlaylistItem[]): void {
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

export function removeAt(index: number): void {
    const item = getAt(index);
    if (item) {
        remove(item);
    }
}

export function shuffle(): void {
    // https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array#6274398
    const items = getItems();
    let counter = items.length;
    while (counter > 0) {
        const index = Math.floor(Math.random() * counter);
        counter--;
        const item = items[counter];
        items[counter] = items[index];
        items[index] = item;
    }
    setItems(items);
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
    return items.filter(exists).map(createPlayableItem);
}

function createPlayableItem(item: MediaItem): MediaItem {
    if (!hasPlayableSrc(item)) {
        const {link, ...rest} = item;
        if (link && hasPlayableSrc(link)) {
            return {
                ...rest,
                src: link.src,
                externalUrl: link.externalUrl,
            };
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

function handleLookupEvent({item, bestOf}: LookupEvent): void {
    const items = getItems();
    const index = items.indexOf(item as PlaylistItem);
    if (index !== -1) {
        items[index] = {...item, ...bestOf} as PlaylistItem;
        setItems(items);
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
    getCurrentItem,
    setCurrentItem,
    add,
    clear,
    eject,
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
    const items = (await dbRead<PlaylistItem[]>('items', store)) ?? [];
    items$.next(items);
    const id = (await dbRead('currently-playing-id', store)) ?? '';
    currentItemId$.next(id);
})();

items$
    .pipe(
        skip(2),
        debounceTime(delayWriteTime),
        mergeMap((items) => dbWrite('items', items, store))
    )
    .subscribe(logger);

currentItemId$
    .pipe(
        skip(2),
        debounceTime(delayWriteTime),
        mergeMap((id) => dbWrite('currently-playing-id', id, store))
    )
    .subscribe(logger);

observeLookupEvents().pipe(tap(handleLookupEvent)).subscribe(logger);
