import React, {useCallback} from 'react';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import {srcToPath} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
import Button from 'components/Button';
import useHistory from 'components/MediaBrowser/useHistory';
import LinearType from 'types/LinearType';

export interface NavigationButtonProps {
    item: MediaObject;
}

export default function NavigationButton({item}: NavigationButtonProps) {
    const {navigateTo} = useHistory();
    const path = srcToPath(item.src);
    const service = getServiceFromSrc(item);
    const canNavigate =
        service?.browsable &&
        item.itemType !== ItemType.Folder &&
        (item as MediaItem).mediaType !== MediaType.Video &&
        (!(item as MediaItem).linearType ||
            (item as MediaItem).linearType === LinearType.MusicTrack);

    const showInBrowser = useCallback(() => {
        navigateTo(path);
    }, [navigateTo, path]);

    return canNavigate ? (
        <Button className="navigation-button" title="Show in media browser" onClick={showInBrowser}>
            Go to…
        </Button>
    ) : null;
}
