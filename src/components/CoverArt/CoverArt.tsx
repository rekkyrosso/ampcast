import React, {useCallback, useEffect, useState} from 'react';
import {from} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import Thumbnail from 'types/Thumbnail';
import {getCoverArtThumbnails} from 'services/musicbrainz/coverart';
import plexSettings from 'services/plex/plexSettings';
import Icon, {IconName} from 'components/Icon';
import {partition} from 'utils';
import './CoverArt.scss';

export interface CoverArtProps {
    className?: string;
    item: MediaObject;
    maxSize?: number;
}

export default function CoverArt({item, maxSize, className = ''}: CoverArtProps) {
    const [thumbnails, setThumbnails] = useState(() => item.thumbnails);
    const hasThumbnails = !!thumbnails?.length;
    const thumbnail = hasThumbnails ? findBestThumbnail(thumbnails, maxSize) : undefined;
    const src = thumbnail ? getThumbnailUrl(thumbnail) : '';
    const fallback = getFallbackIcon(item.itemType);

    useEffect(() => {
        if (!hasThumbnails) {
            const subscription = from(getCoverArtThumbnails(item)).subscribe(setThumbnails);
            return () => subscription.unsubscribe();
        }
    }, [hasThumbnails, item]);

    const handleError = useCallback((event: React.SyntheticEvent) => {
        (event.target as HTMLElement).removeAttribute('src');
    }, []);

    return (
        <figure className={`cover-art ${className}`}>
            {src ? (
                <img className="cover-art-image" src={src} onError={handleError} />
            ) : fallback ? (
                <Icon className="cover-art-image" name={fallback} />
            ) : null}
        </figure>
    );
}

function findBestThumbnail(thumbnails: Thumbnail[], maxSize = 360, aspectRatio = 1): Thumbnail {
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
