import React from 'react';
import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import Icon, {IconName, IconProps} from './Icon';

export interface MediaIconProps extends Except<IconProps, 'name'> {
    item: MediaObject;
}

export default function MediaIcon({item, ...props}: MediaIconProps) {
    const name = useMediaIconName(item);
    return <Icon {...props} name={name} />;
}

function useMediaIconName(item: MediaObject): IconName {
    switch (item.itemType) {
        case ItemType.Artist:
            return 'artist';

        case ItemType.Album:
            return 'album';

        case ItemType.Media:
            if (item.linearType && item.linearType !== LinearType.MusicTrack) {
                return 'radio';
            } else if (item.mediaType === MediaType.Video) {
                return 'video';
            } else {
                return 'audio';
            }

        case ItemType.Playlist:
            return 'playlist';

        case ItemType.Folder:
            return 'folder';

        default:
            return 'audio';
    }
}
