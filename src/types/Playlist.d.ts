import type {Observable} from 'rxjs';
import MediaAlbum from './MediaAlbum';
import MediaItem from './MediaItem';
import MediaPlaylist from './MediaPlaylist';
import PlaylistItem from './PlaylistItem';

export type PlayableType =
    | MediaAlbum
    | MediaItem
    | MediaPlaylist
    | readonly MediaAlbum[]
    | readonly MediaItem[]
    | readonly MediaPlaylist[];

export default interface Playlist {
    readonly atEnd: boolean;
    readonly atStart: boolean;
    readonly size: number;
    observe(): Observable<readonly PlaylistItem[]>;
    observeCurrentIndex(): Observable<number>;
    observeCurrentItem(): Observable<PlaylistItem | null>;
    observeNextItem(): Observable<PlaylistItem | null>;
    observeSize(): Observable<number>;
    getCurrentIndex(): number;
    setCurrentIndex(index: number): void;
    getCurrentItem(): PlaylistItem | null;
    setCurrentItem(item: PlaylistItem | null): void;
    getNextItem(): PlaylistItem | null;
    getItems(): readonly PlaylistItem[];
    setItems(items: readonly PlaylistItem[]): void;
    add(source: PlayableType): Promise<void>;
    clear(): void;
    eject(): void;
    inject(source: PlayableType): Promise<void>;
    injectAt(source: PlayableType, index: number): Promise<void>;
    moveSelection(selection: readonly PlaylistItem[], toIndex: number): void;
    remove(item: PlaylistItem): void;
    remove(items: readonly PlaylistItem[]): void;
    removeAt(index: number): void;
    reverseAt(index: number, length: number): void;
    next(): void;
    prev(): void;
    shuffle(preserveCurrentlyPlaying?: boolean): Promise<void>;
}
