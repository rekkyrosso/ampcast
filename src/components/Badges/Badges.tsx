import React from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import {Badge, BitRateBadge, ExplicitBadge, ReplayGainBadge, ShareLink} from './Badge';
import './Badges.scss';

export interface BadgesProps {
    item: MediaItem | MediaAlbum;
}

export default function Badges({item}: BadgesProps) {
    return (
        <div className="badges">
            <ExplicitBadge item={item} />
            {item.badge ? <Badge>{item.badge}</Badge> : null}
            {item.itemType === ItemType.Media && item.mediaType === MediaType.Audio ? (
                <BitRateBadge item={item} />
            ) : null}
            {item.itemType === ItemType.Media ? <ReplayGainBadge item={item} /> : null}
            <ShareLink item={item} />
        </div>
    );
}
