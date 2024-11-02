import React, {useCallback, useEffect, useState} from 'react';
import {from} from 'rxjs';
import getYouTubeID from 'get-youtube-id';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import Thumbnail from 'types/Thumbnail';
import {findListenByPlayedAt} from 'services/localdb/listens';
import {getEnabledServices} from 'services/mediaServices';
import {getCoverArtThumbnails} from 'services/musicbrainz/coverart';
import youtubeApi from 'services/youtube/youtubeApi';
import Icon, {IconName} from 'components/Icon';
import {Logger} from 'utils';
import './CoverArt.scss';

const logger = new Logger('CoverArt');

export interface CoverArtProps {
    className?: string;
    item: MediaObject;
    size?: number;
    onLoad?: (src: string) => void;
    onError?: () => void;
}

export default function CoverArt({item, size, className = '', onLoad, onError}: CoverArtProps) {
    const [inError, setInError] = useState(false);
    const [thumbnails, setThumbnails] = useState(() => item.thumbnails);
    const hasThumbnails = !!thumbnails?.length;
    const thumbnail = hasThumbnails ? findBestThumbnail(thumbnails, size) : undefined;
    const src = thumbnail ? getThumbnailUrl(thumbnail) : '';
    const fallbackIcon = getFallbackIcon(item);
    const overlayIcon = item.itemType === ItemType.Album && getOverlayIcon(item);

    useEffect(() => {
        setInError(false);
        setThumbnails(item.thumbnails);
    }, [item.thumbnails]);

    useEffect(() => {
        if (!hasThumbnails) {
            if (item.itemType === ItemType.Media) {
                const listen = findListenByPlayedAt(item);
                const hasThumbnail = !!listen?.thumbnails?.[0];
                if (hasThumbnail) {
                    setThumbnails(listen.thumbnails);
                    return;
                }
            }
            const subscription = from(lookupThumbnails(item)).subscribe((thumbnails) => {
                if (thumbnails?.[0]) {
                    setThumbnails(thumbnails);
                } else {
                    setInError(true);
                    onError?.();
                }
            });
            return () => subscription.unsubscribe();
        }
    }, [hasThumbnails, item, onError]);

    const handleError = useCallback(() => {
        setInError(true);
        onError?.();
    }, [onError]);

    const handleLoad = useCallback(() => {
        setInError(false);
        onLoad?.(src);
    }, [onLoad, src]);

    return (
        <figure
            className={`cover-art ${className} ${overlayIcon ? 'cover-art-' + overlayIcon : ''}`}
        >
            {src && !inError ? (
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
            ) : fallbackIcon ? (
                <Icon className="cover-art-image" name={fallbackIcon} />
            ) : null}
        </figure>
    );
}

async function lookupThumbnails(item: MediaObject): Promise<readonly Thumbnail[] | undefined> {
    if (item.itemType === ItemType.Media) {
        const externalUrl = item.link?.externalUrl;
        if (externalUrl) {
            const videoId = getYouTubeID(item.link?.externalUrl);
            if (videoId) {
                try {
                    const video = await youtubeApi.getVideoInfo(videoId);
                    return video.thumbnails;
                } catch (err) {
                    logger.warn(err);
                    return;
                }
            }
        }
    }
    return getCoverArtThumbnails(item);
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

export function getThumbnailUrl(thumbnail: Thumbnail): string {
    return getEnabledServices().reduce(
        (url, service) => service?.getThumbnailUrl?.(url) ?? url,
        thumbnail?.url || ''
    );
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
