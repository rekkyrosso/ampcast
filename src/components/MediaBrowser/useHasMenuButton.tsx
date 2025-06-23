import {useEffect, useState} from 'react';
import ItemType from 'types/ItemType';
import MediaSource, {MediaSourceItems} from 'types/MediaSource';

export default function useHasMenuButton(source: MediaSource<any>): boolean {
    const [hasButton, setHasButton] = useState(false);

    useEffect(() => {
        let hasButton = false;
        const hasOptions = (items?: MediaSourceItems) => {
            return items?.sort || items?.layout?.views?.length !== 0;
        };
        if (hasOptions(source.primaryItems)) {
            hasButton = true;
        } else if (
            source.itemType !== ItemType.Media &&
            source.secondaryItems?.layout?.view !== 'none'
        ) {
            if (hasOptions(source.secondaryItems)) {
                hasButton = true;
            } else if (
                source.itemType === ItemType.Artist &&
                source.tertiaryItems?.layout?.view !== 'none' &&
                hasOptions(source.tertiaryItems)
            ) {
                hasButton = true;
            }
        }
        setHasButton(hasButton);
    }, [source]);

    return hasButton;
}
