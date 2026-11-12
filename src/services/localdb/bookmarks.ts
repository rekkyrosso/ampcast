import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import Bookmark from 'types/Bookmark';
import MediaObject from 'types/MediaObject';
import {Logger} from 'utils';
import {dispatchMetadataChanges, removeUserData} from 'services/metadata';
import {isSourceHidden} from 'services/mediaServices/servicesSettings';

const logger = new Logger('bookmarks');

const bookmarks$ = new BehaviorSubject<readonly Bookmark[]>([]);

class Bookmarks extends Dexie {
    readonly bookmarks!: Dexie.Table<Bookmark, string>;

    constructor() {
        super('ampcast/bookmarks');

        this.version(1).stores({
            bookmarks: `&src, bookmarkedAt`,
        });

        liveQuery(() => this.bookmarks.orderBy('bookmarkedAt').reverse().toArray()).subscribe(
            bookmarks$
        );
    }
}

const store = new Bookmarks();

export function observeBookmarks(): Observable<readonly Bookmark[]> {
    return bookmarks$;
}

export async function addBookmark(item: MediaObject): Promise<void> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {pager, ...bookmark} = removeUserData(item) as any;
        await store.bookmarks.put({...bookmark, bookmarkedAt: Date.now()});
        dispatchMetadataChanges({
            match: (object) => object.src === item.src,
            values: {isBookmarked: true},
        });
    } catch (err) {
        logger.error(err);
    }
}

export async function addBookmarks(bookmarks: readonly Bookmark[]): Promise<void> {
    try {
        await store.bookmarks.bulkPut(bookmarks);
    } catch (err) {
        logger.error(err);
    }
}

export function canBookmark(item: MediaObject): boolean {
    return !!item.links?.self && !isSourceHidden('localdb/bookmarks');
}

export function getBookmarks(): readonly Bookmark[] {
    return bookmarks$.value;
}

export function isBookmarked(item: MediaObject): boolean;
export function isBookmarked(src: string): boolean;
export function isBookmarked(item: MediaObject | string): boolean {
    const src = typeof item === 'string' ? item : item.src;
    return !!getBookmark(src);
}

export async function removeBookmark(bookmark: Bookmark | MediaObject): Promise<void> {
    try {
        await store.bookmarks.delete(bookmark.src);
        dispatchMetadataChanges({
            match: (object) => object.src === bookmark.src,
            values: {isBookmarked: false},
        });
    } catch (err) {
        logger.error(err);
    }
}

export async function removeBookmarks(
    bookmarks: readonly (Bookmark | MediaObject)[]
): Promise<void> {
    try {
        await store.bookmarks.bulkDelete(bookmarks.map((bookmark) => bookmark.src));
        dispatchMetadataChanges(
            bookmarks.map((bookmark) => ({
                match: (object: MediaObject) => object.src === bookmark.src,
                values: {isBookmarked: false},
            }))
        );
    } catch (err) {
        logger.error(err);
    }
}

function getBookmark(src: string): Bookmark | undefined {
    return getBookmarks().find((item) => item.src === src);
}
