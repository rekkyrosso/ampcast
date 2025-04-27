import React, {useCallback, useMemo} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import {copyMediaObjectToClipboard} from 'services/reporting';
import CopyButton from 'components/Button/CopyButton';
import DetailsBox from 'components/ListView/DetailsBox';
import {MediaInfoProps} from './MediaInfo';
import './MediaDetails.scss';

export default function MediaDetails<T extends MediaObject>({item}: MediaInfoProps<T>) {
    const object = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {pager, parent, ...object} = item as any;
        return object;
    }, [item]);

    const handleCopyClick = useCallback(async () => {
        await copyMediaObjectToClipboard(item);
    }, [item]);

    const renderItem = useCallback((value: any, key: keyof T) => {
        switch (key) {
            case 'itemType':
                switch (value) {
                    case ItemType.Album:
                        return 'Album';
                    case ItemType.Artist:
                        return 'Artist';
                    case ItemType.Folder:
                        return 'Folder';
                    case ItemType.Media:
                        return 'Media';
                    case ItemType.Playlist:
                        return 'Playlist';
                    default:
                        return 'unknown';
                }

            case 'mediaType':
                switch (value) {
                    case MediaType.Audio:
                        return 'Audio';
                    case MediaType.Video:
                        return 'Video';
                    default:
                        return 'unknown';
                }

            case 'playbackType':
                switch (value) {
                    case PlaybackType.DASH:
                        return 'DASH';
                    case PlaybackType.Direct:
                        return 'Direct';
                    case PlaybackType.HLS:
                        return 'HLS';
                    case PlaybackType.IFrame:
                        return 'IFrame';
                    default:
                        return 'unknown';
                }

            case 'thumbnails':
                return `[${value?.length || 0}]`;

            default:
                return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
    }, []);

    return (
        <div className="media-details">
            <DetailsBox object={object as T} renderItem={renderItem} title="Medial Details" />
            <p>
                <CopyButton onClick={handleCopyClick}>Copy data</CopyButton>
            </p>
        </div>
    );
}
