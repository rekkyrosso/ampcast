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
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import LookupStatus from 'types/LookupStatus';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import PlaybackType from 'types/PlaybackType';
import Playlist, {PlayableType} from 'types/Playlist';
import PlaylistItem from 'types/PlaylistItem';
import {exists, isMiniPlayer, shuffle as shuffleArray, Logger} from 'utils';
import {
    LookupStartEvent,
    LookupEndEvent,
    LookupCancelledEvent,
    observeLookupStartEvents,
    observeLookupEndEvents,
    observeLookupCancelledEvents,
} from 'services/lookup';
import {observeMetadataChanges, removeUserData} from 'services/metadata';
import fetchAllTracks from 'services/pagers/fetchAllTracks';
import playlistStore from './playlistStore';

const logger = new Logger('playlist');

const delayWriteTime = 500;

const UNINITIALIZED: PlaylistItem[] = [];
const items$ = new BehaviorSubject<PlaylistItem[]>(UNINITIALIZED);
const currentItemId$ = new BehaviorSubject('');
const currentTrack$ = new BehaviorSubject<PlaylistItem | null>(null);

export function getItems(): PlaylistItem[] {
    return items$.value;
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
    return currentItemId$.value;
}

function setCurrentItemId(id: string): void {
    currentItemId$.next(id);
}

export function getCurrentItem(): PlaylistItem | null {
    const items = getItems();
    const currentItemId = getCurrentItemId();
    return items.find((item) => item.id === currentItemId) || null;
}

export function getCurrentTrack(): PlaylistItem | null {
    return currentTrack$.value;
}

export function setCurrentItem(item: PlaylistItem | null): void {
    setCurrentItemId(item?.id || '');
}

export function observeCurrentItem(): Observable<PlaylistItem | null> {
    return combineLatest([items$, currentItemId$]).pipe(
        map(([items, id]) => items.find((item) => item.id === id) ?? null),
        distinctUntilChanged()
    );
}

export function observeCurrentTrack(): Observable<PlaylistItem | null> {
    return currentTrack$;
}

export function getNextItem(): PlaylistItem | null {
    const items = getItems();
    const index = getCurrentIndex();
    return items[index + 1] || null;
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
    const items = items$.value;
    const currentItemId = getCurrentItemId();
    return items.findIndex((item) => item.id === currentItemId);
}

export function setCurrentIndex(index: number): void {
    const items = items$.value;
    setCurrentItem(items[index]);
}

export function observeSize(): Observable<number> {
    return items$.pipe(
        map((items) => items.length),
        distinctUntilChanged()
    );
}

function getSize(): number {
    return items$.value.length;
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
    return injectAt(items, -1);
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

export async function inject(items: PlayableType): Promise<void> {
    return injectAt(items, getCurrentIndex() + 1);
}

export async function injectAt(items: PlayableType, index: number): Promise<void> {
    const all = getItems();
    const additions = await createMediaItems(items);
    if (additions.length > 0) {
        const newItems = additions.map((item) => ({
            ...removeUserData(item),
            linearType: item.linearType === LinearType.Station ? item.linearType : undefined,
            playbackType: isDerivedPlaybackType(item) ? undefined : item.playbackType,
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

export function next(): void {
    moveCurrentIndexBy(+1);
}

export function prev(): void {
    moveCurrentIndexBy(-1);
}

export function remove(item: PlaylistItem | readonly PlaylistItem[]): void {
    const items = getItems();
    const removals = Array.isArray(item) ? item : [item];
    const removalIds: Record<string, boolean> = {};
    for (const removal of removals) {
        removalIds[removal.id] = true;
    }
    const newItems = items.filter((item) => !(item.id in removalIds));
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

export function reverseAt(index: number, length: number): void {
    const items = getItems();
    const reversals = items.slice(index, index + length).reverse();
    items.splice(index, length, ...reversals);
    setItems(items);
}

export async function shuffle(preserveCurrentItem?: boolean): Promise<void> {
    const currentItems = getItems().slice();
    if (currentItems.length > 0) {
        const currentItem = getCurrentItem();
        if (preserveCurrentItem && currentItem) {
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
    const isAlbumOrPlaylist = (source: PlayableType): source is MediaAlbum | MediaPlaylist => {
        return (
            'itemType' in source &&
            (source.itemType === ItemType.Album || source.itemType === ItemType.Playlist)
        );
    };
    let items: readonly (MediaItem | null)[] = [];
    if (Array.isArray(source)) {
        if (source.length === 0) {
            return [];
        } else if (isAlbumOrPlaylist(source[0])) {
            const tracks = await Promise.all(source.map((source) => fetchAllTracks(source)));
            items = tracks.flat();
        } else {
            items = source;
        }
    } else if (isAlbumOrPlaylist(source)) {
        items = await fetchAllTracks(source);
    } else {
        items = [source as MediaItem];
    }
    return items.filter(exists);
}

function isDerivedPlaybackType(item: MediaItem): boolean {
    // These should be derived close to playback time.
    return item.playbackType === PlaybackType.HLS && /^(emby|jellyfin|plex):/.test(item.src);
}

const playlist: Playlist = {
    get atEnd(): boolean {
        return getCurrentIndex() === getSize() - 1;
    },
    get atStart(): boolean {
        return getSize() === 0 || getCurrentIndex() === 0;
    },
    get size(): number {
        return getSize();
    },
    observe,
    observeCurrentIndex,
    observeCurrentItem,
    observeNextItem,
    observeSize,
    getCurrentIndex,
    setCurrentIndex,
    getCurrentItem,
    setCurrentItem,
    getNextItem,
    getItems,
    setItems,
    add,
    clear,
    eject,
    inject,
    injectAt,
    moveSelection,
    next,
    prev,
    remove,
    removeAt,
    reverseAt,
    shuffle,
};

export default playlist;

if (isMiniPlayer) {
    setCurrentItemId('');
    setItems([]);
} else {
    // Load playlist from browser storage.
    (async () => {
        const [items, id] = await Promise.all([
            playlistStore.getItems(),
            playlistStore.getCurrentItemId(),
        ]);
        setCurrentItemId(id);
        setItems(items);
    })();

    // Save playlist to browser storage.
    items$
        .pipe(
            skip(2),
            debounceTime(delayWriteTime),
            mergeMap((items: PlaylistItem[]) => {
                items = items.map((item) => {
                    if (isDerivedPlaybackType(item)) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const {lookupStatus, playbackType, ...rest} = item;
                        return rest;
                    } else if ('lookupStatus' in item) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const {lookupStatus, ...rest} = item;
                        return rest;
                    } else {
                        return item;
                    }
                });
                return playlistStore.setItems(items);
            })
        )
        .subscribe(logger);

    // Save "currently playing" to browser storage.
    currentItemId$
        .pipe(
            skip(2),
            debounceTime(delayWriteTime),
            mergeMap((id) => playlistStore.setCurrentItemId(id))
        )
        .subscribe(logger);

    // Observe "lookup" events.
    // For last.fm/ListenBrainz.

    observeLookupStartEvents()
        .pipe(
            tap(({lookupItem}: LookupStartEvent) => {
                const items = getItems();
                const index = items.findIndex((item) => item.id === lookupItem.id);
                if (index !== -1) {
                    items[index] = {...lookupItem, lookupStatus: LookupStatus.Looking};
                    setItems(items);
                }
            })
        )
        .subscribe(logger);

    observeLookupEndEvents()
        .pipe(
            tap(({lookupItem, foundItem}: LookupEndEvent) => {
                const items = getItems();
                const index = items.findIndex((item) => item.id === lookupItem.id);
                if (index !== -1) {
                    items[index] = foundItem
                        ? {...removeUserData(foundItem), id: lookupItem.id}
                        : {...items[index], lookupStatus: LookupStatus.NotFound};
                    setItems(items);
                }
            })
        )
        .subscribe(logger);

    observeLookupCancelledEvents()
        .pipe(
            tap(({lookupItem}: LookupCancelledEvent) => {
                const items = getItems();
                const index = items.findIndex((item) => item.id === lookupItem.id);
                if (index !== -1) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const {lookupStatus, ...item} = items[index];
                    items[index] = item;
                    setItems(items);
                }
            })
        )
        .subscribe(logger);

    // Update playlist items with metadata changes.
    observeMetadataChanges<MediaItem>()
        .pipe(
            tap((changes) => {
                let changed = false;
                const items = getItems().map((item) => {
                    for (const {match, values} of changes) {
                        if (match(item)) {
                            const nonUserData = removeUserData(values);
                            if (Object.keys(nonUserData).length > 0) {
                                changed = true;
                                return {...item, ...nonUserData, id: item.id};
                            }
                        }
                    }
                    return item;
                });
                if (changed) {
                    setItems(items);
                }
            })
        )
        .subscribe(logger);
}
