import {RadioItem} from 'types/InternetRadio';
import MediaObject from 'types/MediaObject';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('internet-radio');

export function canStore<T extends MediaObject>(item: T): boolean {
    return item.src.startsWith('internet-radio:station:');
}

export async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    bulkStore([item], inLibrary);
}

export async function bulkStore(items: readonly MediaObject[], inLibrary: boolean): Promise<void> {
    const favorites = new Set(getFavoriteIds());
    for (const item of items) {
        const id = (item as RadioItem).radio.id;
        if (inLibrary) {
            favorites.add(id);
        } else {
            favorites.delete(id);
        }
        storage.setJson<string[]>('favorites', [...favorites]);
    }
}

export function getFavoriteIds(): readonly string[] {
    // Return in "Recently Added" order (for now).
    return storage.getJson<string[]>('favorites', []).reverse();
}
