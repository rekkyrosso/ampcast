import React, {useCallback, useEffect, useState} from 'react';
import {from} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import Thumbnail from 'types/Thumbnail';
import {findListen} from 'services/localdb/listens';
import {getCoverArtThumbnails} from 'services/musicbrainz/coverart';
import plexSettings from 'services/plex/plexSettings';
import Icon, {IconName} from 'components/Icon';
import './CoverArt.scss';

export interface CoverArtProps {
    className?: string;
    item: MediaObject;
    size?: number;
}

export default function CoverArt({item, size, className = ''}: CoverArtProps) {
    const [thumbnails, setThumbnails] = useState(() => item.thumbnails);
    const hasThumbnails = !!thumbnails?.length;
    const thumbnail = hasThumbnails ? findBestThumbnail(thumbnails, size) : undefined;
    const src = thumbnail ? getThumbnailUrl(thumbnail) : '';
    const fallback = getFallbackIcon(item.itemType);

    useEffect(() => {
        if (!hasThumbnails) {
            if (item.itemType === ItemType.Media) {
                const listen = findListen(item);
                if (listen && listen.thumbnails) {
                    setThumbnails(listen.thumbnails);
                    return;
                }
            }
            const subscription = from(getCoverArtThumbnails(item)).subscribe(setThumbnails);
            return () => subscription.unsubscribe();
        }
    }, [hasThumbnails, item]);

    const handleError = useCallback(() => setThumbnails(undefined), []);

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

function findBestThumbnail(thumbnails: Thumbnail[], size = 240): Thumbnail {
    if (thumbnails.length === 1) {
        return thumbnails[0];
    }
    let matches = thumbnails.filter((thumbnail) => getAspectRatio(thumbnail) < 1.34);
    if (matches.length === 0) {
        matches = thumbnails.filter((thumbnail) => getAspectRatio(thumbnail) < 1.5);
        if (matches.length === 0) {
            matches = thumbnails;
        }
    }
    size *= window.devicePixelRatio;
    matches.sort((a, b) => Math.abs(a.height - size) - Math.abs(b.height - size));
    return matches[0];
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

function getAspectRatio({width, height}: Thumbnail): number {
    return width / height;
}
