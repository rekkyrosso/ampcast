import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import ItemsByService from 'types/ItemsByService';
import MediaItem from 'types/MediaItem';
import {addMetadata} from 'services/musicbrainz/musicbrainzApi';
import {getPlaylistItemsByService} from 'services/recentPlaylists';

export default function usePlaylistItemsByService<T extends MediaItem>(
    items: readonly T[]
): readonly ItemsByService<T>[] {
    const [itemsByService, setItemsByService] = useState<readonly ItemsByService<T>[]>([]);

    useEffect(() => {
        const itemsByService = getPlaylistItemsByService(items).slice();
        const index = itemsByService.findIndex((items) => items.service.id === 'listenbrainz');
        if (index === -1) {
            setItemsByService(itemsByService);
        } else {
            const listenbrainz = itemsByService[index];
            const items = listenbrainz.items;
            const subscription = from(addMetadata(items, false)).subscribe((items) => {
                items = items.filter((item) => item.recording_mbid);
                if (items.length === 0) {
                    itemsByService.splice(index, 1);
                } else {
                    const service = listenbrainz.service;
                    itemsByService[index] = {service, items};
                }
                setItemsByService(itemsByService);
            });
            return () => subscription.unsubscribe();
        }
    }, [items]);

    return itemsByService;
}
