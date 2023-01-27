import {useEffect, useState} from 'react';
import {Subscription} from 'rxjs';
import {observeLibraryChanges, observeRatingChanges} from 'services/actions';
import pinStore from 'services/pins/pinStore';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';

export default function useCurrentItem(item: MediaObject): MediaObject {
    const [currentItem, setCurrentItem] = useState<MediaObject>(() => item);

    useEffect(() => {
        setCurrentItem(item);
        const subscription = new Subscription();
        subscription.add(
            observeRatingChanges().subscribe((changes) => {
                const change = changes.find((change) => change.src === item.src);
                if (change) {
                    setCurrentItem({...item, rating: change.rating});
                }
            })
        );
        subscription.add(
            observeLibraryChanges().subscribe((changes) => {
                const change = changes.find((change) => change.src === item.src);
                if (change) {
                    setCurrentItem({...item, inLibrary: change.inLibrary});
                }
            })
        );
        if (item.itemType === ItemType.Playlist) {
            subscription.add(
                pinStore.observeAdditions().subscribe((additions) => {
                    const addition = additions.find((addition) => addition.src === item.src);
                    if (addition) {
                        setCurrentItem({...item, isPinned: true});
                    }
                })
            );
            subscription.add(
                pinStore.observeRemovals().subscribe((removals) => {
                    const removal = removals.find((addition) => addition.src === item.src);
                    if (removal) {
                        setCurrentItem({...item, isPinned: false});
                    }
                })
            );
        }
    }, [item]);

    return currentItem;
}
