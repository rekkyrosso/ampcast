import {useEffect, useState} from 'react';
import MediaObject from 'types/MediaObject';
import mediaObjectChanges from 'services/actions/mediaObjectChanges';

export default function useCurrentItem<T extends MediaObject>(item: T): T {
    const [currentItem, setCurrentItem] = useState<T>(() => item);

    useEffect(() => {
        setCurrentItem(item);

        const subscription = mediaObjectChanges.observe<T>().subscribe((changes) => {
            for (const {match, values} of changes) {
                if (match(item)) {
                    setCurrentItem({...item, ...values});
                    break;
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [item]);

    return currentItem;
}
