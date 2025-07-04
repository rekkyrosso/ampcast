import React, {useCallback, useEffect, useState} from 'react';
import {defer} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaObject from 'types/MediaObject';
import Thumbnail from 'types/Thumbnail';
import {Logger} from 'utils';
import {findThumbnails, getThumbnailUrl, isSameThumbnails} from 'services/metadata';
import Icon, {IconName} from 'components/Icon';
import MediaIcon from 'components/Icon/MediaIcon';
import './CoverArt.scss';

const logger = new Logger('CoverArt');

export interface CoverArtProps {
    className?: string;
    item: MediaObject;
    size?: number;
    placeholder?: boolean; // Don't load the thumbnail image.
    onLoad?: (src: string) => void;
    onError?: () => void;
    // This property is expensive and may result in lots of HTTP requests.
    extendedSearch?: boolean; // Perform a deeper search for thumbnails if missing.
}

export default function CoverArt({item, className = '', placeholder, ...props}: CoverArtProps) {
    const [ready, setReady] = useState(!placeholder);
    const overlayIcon = item.itemType === ItemType.Album && getOverlayIcon(item);

    useEffect(() => {
        if (!placeholder) {
            setReady(true);
        }
    }, [placeholder]);

    return (
        <figure
            className={`cover-art ${className} ${overlayIcon ? 'cover-art-' + overlayIcon : ''}`}
        >
            {ready ? <CoverArtImage {...props} item={item} key={item.src} /> : null}
        </figure>
    );
}

function CoverArtImage({item, size, extendedSearch, onLoad, onError}: CoverArtProps) {
    const [inError, setInError] = useState(false);
    const [thumbnails, setThumbnails] = useState(() => item.thumbnails);
    const hasThumbnails = !!thumbnails?.length;
    const thumbnail = hasThumbnails ? findBestThumbnail(thumbnails, size) : undefined;
    const src = thumbnail ? getThumbnailUrl(thumbnail) : '';
    const overlayIcon = item.itemType === ItemType.Album && getOverlayIcon(item);

    useEffect(() => {
        setInError(false);
        setThumbnails((prevThumbnails) =>
            isSameThumbnails(item.thumbnails, prevThumbnails) ? prevThumbnails : item.thumbnails
        );
    }, [item.thumbnails]);

    useEffect(() => {
        if (!hasThumbnails) {
            const controller = new AbortController();
            const subscription = defer(() =>
                findThumbnails(item, extendedSearch, controller.signal)
            ).subscribe({
                next: (thumbnails) => {
                    if (thumbnails?.[0]) {
                        setThumbnails(thumbnails);
                    } else {
                        setInError(true);
                        onError?.();
                    }
                },
                error: (err) => {
                    logger.warn(err);
                    setInError(true);
                    onError?.();
                },
            });
            return () => {
                subscription.unsubscribe();
                controller.abort('Cancelled');
            };
        }
    }, [hasThumbnails, item, extendedSearch, onError]);

    const handleError = useCallback(() => {
        setInError(true);
        onError?.();
    }, [onError]);

    const handleLoad = useCallback(() => {
        setInError(false);
        onLoad?.(src);
    }, [onLoad, src]);

    return src && !inError ? (
        <>
            <img
                className="cover-art-image"
                src={src}
                alt={`${item.title}: Cover art`}
                onError={handleError}
                onLoad={handleLoad}
            />
            {overlayIcon ? (
                <div className="cover-art-icon-overlay">
                    <Icon className="cover-art-icon" name={overlayIcon} />
                </div>
            ) : null}
        </>
    ) : (
        <MediaIcon className="cover-art-image" item={item} />
    );
}

function findBestThumbnail(thumbnails: readonly Thumbnail[], size = 240): Thumbnail {
    if (thumbnails.length === 1) {
        return thumbnails[0];
    }
    let matches = thumbnails.filter((thumbnail) => getAspectRatio(thumbnail) < 1.34);
    if (matches.length === 0) {
        matches = thumbnails.filter((thumbnail) => getAspectRatio(thumbnail) < 1.5);
        if (matches.length === 0) {
            matches = thumbnails.slice();
        }
    }
    size *= window.devicePixelRatio || 1;
    matches.sort((a, b) => Math.abs(a.height - size) - Math.abs(b.height - size));
    return matches[0];
}

function getOverlayIcon(item: MediaAlbum): IconName | '' {
    if (!item.synthetic) {
        return '';
    }
    const [, type] = item.src.split(':');
    switch (type) {
        case 'top-tracks':
            return 'star';

        case 'videos':
            return 'video';

        default:
            return 'audio';
    }
}

function getAspectRatio({width, height}: Thumbnail): number {
    return width / height;
}
