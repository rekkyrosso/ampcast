import type {Observable} from 'rxjs';
import MediaAlbum from './MediaAlbum';
import MediaItem from './MediaItem';
import PlaylistItem from './PlaylistItem';

export default interface Playlist {
    readonly atEnd: boolean;
    readonly atStart: boolean;
    observe(): Observable<readonly PlaylistItem[]>;
    observeCurrentIndex(): Observable<number>;
    observeCurrentItem(): Observable<PlaylistItem | null>;
    observeNextItem(): Observable<PlaylistItem | null>;
    observeSize(): Observable<number>;
    getCurrentIndex(): number;
    getCurrentItem(): PlaylistItem | null;
    setCurrentItem(item: PlaylistItem): void;
    getItems(): readonly PlaylistItem[];
    add(album: MediaAlbum): Promise<void>;
    add(item: MediaItem): Promise<void>;
    add(items: readonly MediaItem[]): Promise<void>;
    clear(): void;
    eject(): void;
    inject(album: MediaAlbum): Promise<void>;
    inject(albums: readonly MediaAlbum[]): Promise<void>;
    inject(item: MediaItem): Promise<void>;
    inject(items: readonly MediaItem[]): Promise<void>;
    injectAt(album: MediaAlbum, index: number): Promise<void>;
    injectAt(albums: readonly MediaAlbum[], index: number): Promise<void>;
    injectAt(item: MediaItem, index: number): Promise<void>;
    injectAt(items: readonly MediaItem[], index: number): Promise<void>;
    moveSelection(selection: readonly PlaylistItem[], toIndex: number): void;
    remove(item: PlaylistItem): void;
    remove(items: readonly PlaylistItem[]): void;
    removeAt(index: number): void;
    reverseAt(index: number, length: number): void;
    next(): void;
    prev(): void;
    shuffle(preserveCurrentlyPlaying?: boolean): Promise<void>;
}
