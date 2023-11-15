import React, {useCallback, useEffect, useState} from 'react';
import {from} from 'rxjs';
import getYouTubeID from 'get-youtube-id';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import Thumbnail from 'types/Thumbnail';
import {findListen} from 'services/localdb/listens';
import {getService} from 'services/mediaServices';
import {getCoverArtThumbnails} from 'services/musicbrainz/coverart';
import {getYouTubeVideoInfo} from 'services/youtube';
import Icon, {IconName} from 'components/Icon';
import {Logger} from 'utils';
import './CoverArt.scss';

const logger = new Logger('CoverArt');

export interface CoverArtProps {
    className?: string;
    item: MediaObject;
    size?: number;
}

export default function CoverArt({item, size, className = ''}: CoverArtProps) {
    const [inError, setInError] = useState(false);
    const [thumbnails, setThumbnails] = useState(() => item.thumbnails);
    const hasThumbnails = !!thumbnails?.length;
    const thumbnail = hasThumbnails ? findBestThumbnail(thumbnails, size) : undefined;
    const src = thumbnail ? getThumbnailUrl(item, thumbnail) : '';
    const fallbackIcon = getFallbackIcon(item);
    const overlayIcon = item.itemType === ItemType.Album && getOverlayIcon(item);

    useEffect(() => setThumbnails(item.thumbnails), [item.thumbnails]);

    useEffect(() => {
        if (!hasThumbnails) {
            if (item.itemType === ItemType.Media) {
                const listen = findListen(item);
                if (listen && listen.thumbnails) {
                    setThumbnails(listen.thumbnails);
                    return;
                }
            }
            const subscription = from(lookupThumbnails(item)).subscribe(setThumbnails);
            return () => subscription.unsubscribe();
        }
    }, [hasThumbnails, item]);

    const handleError = useCallback(() => setInError(true), []);

    return (
        <figure
            className={`cover-art ${className} ${overlayIcon ? 'cover-art-' + overlayIcon : ''}`}
            key={item.src}
        >
            {src && !inError ? (
                <>
                    <img
                        className="cover-art-image"
                        src={src}
                        alt={`${item.title}: Cover art`}
                        onError={handleError}
                    />
                    {overlayIcon ? (
                        <div className="cover-art-icon-overlay">
                            <Icon className="cover-art-icon" name={overlayIcon} />
                        </div>
                    ) : null}
                </>
            ) : fallbackIcon ? (
                <Icon className="cover-art-image" name={fallbackIcon} />
            ) : null}
        </figure>
    );
}

async function lookupThumbnails(item: MediaObject): Promise<Thumbnail[] | undefined> {
    if (item.itemType === ItemType.Media) {
        const externalUrl = item.link?.externalUrl;
        if (externalUrl) {
            const videoId = getYouTubeID(item.link?.externalUrl);
            if (videoId) {
                try {
                    const video = await getYouTubeVideoInfo(videoId);
                    return video.thumbnails;
                } catch (err) {
                    logger.error(err);
                    return;
                }
            }
        }
    }
    return getCoverArtThumbnails(item);
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
    size *= window.devicePixelRatio || 1;
    matches.sort((a, b) => Math.abs(a.height - size) - Math.abs(b.height - size));
    return matches[0];
}

export function getThumbnailUrl(item: MediaObject, thumbnail: Thumbnail): string {
    const [serviceId] = item.src.split(':');
    const service = getService(serviceId);
    const url = thumbnail.url;
    return service?.getThumbnailUrl?.(url) || url;
}

function getFallbackIcon(item: MediaObject): IconName {
    switch (item.itemType) {
        case ItemType.Artist:
            return 'artist';

        case ItemType.Album: {
            const icon = getOverlayIcon(item);
            return icon && icon !== 'audio' ? icon : 'album';
        }

        case ItemType.Media:
            if (item.mediaType === MediaType.Video) {
                return 'video';
            } else {
                return 'audio';
            }

        case ItemType.Playlist:
            return 'playlist';

        case ItemType.Folder:
            return 'folder';
    }
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
