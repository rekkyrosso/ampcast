import React from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import {
    Badge,
    AlbumTypeBadge,
    BitRateBadge,
    ExplicitBadge,
    LastFmBadge,
    LivePlaybackBadge,
    MusicBrainzBadge,
    ReplayGainBadge,
    ShareLink,
} from './Badge';
import './Badges.scss';

export interface BadgesProps {
    item: MediaItem | MediaAlbum | MediaArtist;
}

export default function Badges({item}: BadgesProps) {
    return (
        <div className="badges">
            {item.itemType === ItemType.Album ? <AlbumTypeBadge item={item} /> : null}
            {item.itemType === ItemType.Media ? <LivePlaybackBadge item={item} /> : null}
            {item.itemType === ItemType.Artist ? null : (
                <>
                    <ExplicitBadge item={item} />
                    {item.badge ? <Badge>{item.badge}</Badge> : null}
                    {item.itemType === ItemType.Media && item.mediaType === MediaType.Audio ? (
                        <BitRateBadge item={item} />
                    ) : null}
                    {item.itemType === ItemType.Media ? <ReplayGainBadge item={item} /> : null}
                    <ShareLink item={item} />
                </>
            )}
            <LastFmBadge item={item} />
            <MusicBrainzBadge item={item} />
        </div>
    );
}
