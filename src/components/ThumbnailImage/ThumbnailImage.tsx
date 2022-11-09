import React from 'react';
import {SetRequired} from 'type-fest';
import Thumbnail from 'types/Thumbnail';
import pixel from 'assets/pixel.png.base64';
import plexSettings from 'services/plex/plexSettings';
import Icon, {IconName} from 'components/Icon';
import {partition} from 'utils';
import './ThumbnailImage.scss';

const defaultThumbnail: Thumbnail = {
    url: pixel,
    width: 1,
    height: 1,
};

export interface ThumbnailImageProps {
    className?: string;
    thumbnails?: Thumbnail[];
    maxSize?: number;
    fallbackIcon?: IconName;
}

export default function ThumbnailImage({
    thumbnails,
    maxSize,
    className = '',
    fallbackIcon,
}: ThumbnailImageProps) {
    return thumbnails?.length ? (
        <Image className={className} thumbnails={thumbnails} maxSize={maxSize} />
    ) : fallbackIcon ? (
        <FallbackIcon className={className} fallbackIcon={fallbackIcon} />
    ) : (
        <div className={`thumbnail-image ${className}`} />
    );
}

function Image({thumbnails, maxSize, className = ''}: ThumbnailImageProps) {
    const thumbnail = findBestThumbnail(thumbnails, maxSize);
    const url = thumbnail.url.replace('{plex-token}', plexSettings.serverToken);

    return (
        <div
            className={`thumbnail-image ${className}`}
            style={{
                backgroundImage: `url(${url})`,
            }}
        />
    );
}

function FallbackIcon({
    fallbackIcon,
    className = '',
}: SetRequired<ThumbnailImageProps, 'fallbackIcon'>) {
    return <Icon className={`thumbnail-image ${className}`} name={fallbackIcon} />;
}

export function findBestThumbnail(thumbnails: Thumbnail[] = [], maxSize = 360, aspectRatio = 1) {
    if (thumbnails.length === 0) {
        return defaultThumbnail;
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
    return tooBig[tooBig.length - 1] || defaultThumbnail;
}
