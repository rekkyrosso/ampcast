import React, {useEffect, useState} from 'react';
import {from} from 'rxjs';
import MediaObject from 'types/MediaObject';
import ItemType from 'types/ItemType';
import Thumbnail from 'types/Thumbnail';
import {getCoverArtThumbnails} from 'services/musicbrainz/coverart';
import plexSettings from 'services/plex/plexSettings';
import Icon, {IconName} from 'components/Icon';
import {partition} from 'utils';
import './ThumbnailImage.scss';

export interface ThumbnailImageProps {
    className?: string;
    item: MediaObject;
    maxSize?: number;
}

export default function ThumbnailImage({item, maxSize, className = ''}: ThumbnailImageProps) {
    const [thumbnails, setThumbnails] = useState(() => item.thumbnails);
    const hasThumbnails = !!thumbnails?.length;

    useEffect(() => {
        if (!hasThumbnails) {
            const subscription = from(getCoverArtThumbnails(item)).subscribe(setThumbnails);
            return () => subscription.unsubscribe();
        }
    }, [hasThumbnails, item]);

    return hasThumbnails ? (
        <Image className={className} thumbnails={thumbnails} maxSize={maxSize} />
    ) : (
        <Placeholder className={className} item={item} />
    );
}

interface ImageProps {
    className?: string;
    thumbnails: Thumbnail[];
    maxSize?: number;
}

function Image({thumbnails, maxSize, className = ''}: ImageProps) {
    const thumbnail = findBestThumbnail(thumbnails, maxSize);
    const backgroundImage = thumbnail ? `url(${getThumbnailUrl(thumbnail)}` : 'none';

    return <div className={`thumbnail-image ${className}`} style={{backgroundImage}} />;
}

function Placeholder({item, className = ''}: ThumbnailImageProps) {
    const fallbackIcon = getFallbackIcon(item.itemType);

    return fallbackIcon ? (
        <Icon className={`thumbnail-image ${className}`} name={fallbackIcon} />
    ) : (
        <div className={`thumbnail-image ${className}`} />
    );
}

export function findBestThumbnail(
    thumbnails: Thumbnail[] = [],
    maxSize = 360,
    aspectRatio = 1
): Thumbnail | undefined {
    if (thumbnails.length === 0) {
        return;
    }
    thumbnails.sort((a, b) => b.width * b.height - a.width * a.height); // permanent sort
    const isNotTooBig = (thumbnail: Thumbnail) =>
        thumbnail.width <= maxSize && thumbnail.height <= maxSize;
    const [smallEnough, tooBig] = partition(thumbnails, isNotTooBig);
    if (smallEnough.length > 0) {
        smallEnough.sort((thumbnail1, thumbnail2) => {
            const aspectRatio1 = thumbnail1.width / thumbnail1.height;
            const proximity1 = Math.abs(aspectRatio1 - aspectRatio);
            const aspectRatio2 = thumbnail2.width / thumbnail2.height;
            const proximity2 = Math.abs(aspectRatio2 - aspectRatio);
            return proximity1 - proximity2;
        });
        return smallEnough[0];
    }
    return tooBig[tooBig.length - 1];
}

export function getThumbnailUrl(thumbnail: Thumbnail): string {
    return thumbnail.url.replace('{plex-token}', plexSettings.serverToken);
}

function getFallbackIcon(type: ItemType): IconName | undefined {
    switch (type) {
        case ItemType.Artist:
            return 'person';

        case ItemType.Album:
            return 'album';

        case ItemType.Media:
            return 'note';
    }
}
