import React from 'react';
import MediaItem from 'types/MediaItem';
import AppleMusicVideos from 'services/apple/components/AppleMusicVideos';
import MediaItems from './MediaItems';
import {PagedItemsProps} from './PagedItems';

export default function Videos(props: PagedItemsProps<MediaItem>) {
    if (props.service.id === 'apple') {
        return <AppleMusicVideos {...props} />;
    } else {
        return <MediaItems {...props} />;
    }
}
