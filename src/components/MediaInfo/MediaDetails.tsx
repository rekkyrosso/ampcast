import React, {useCallback, useMemo, useState} from 'react';
import AlbumType from 'types/AlbumType';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import {copyToClipboard, formatTime} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {copyMediaObjectToClipboard} from 'services/reporting';
import {CopyButton} from 'components/Button';
import DetailsBox from 'components/ListView/DetailsBox';
import {MediaInfoProps} from './MediaInfo';
import './MediaDetails.scss';

export default function MediaDetails<T extends MediaObject>({item}: MediaInfoProps<T>) {
    const [value, setValue] = useState<any>();

    const object = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {pager, parentFolder, ...object} = item as any;
        return object;
    }, [item]);

    const handleCopyClick = useCallback(async () => {
        await copyToClipboard(value);
    }, [value]);

    const handleCopyAllClick = useCallback(async () => {
        await copyMediaObjectToClipboard(item);
    }, [item]);

    const renderItem = useCallback((value: any, key: keyof T) => {
        switch (key) {
            case 'albumType':
                switch (value) {
                    case AlbumType.Album:
                        return 'Album';
                    case AlbumType.LiveAlbum:
                        return 'LiveAlbum';
                    case AlbumType.Compilation:
                        return 'Compilation';
                    case AlbumType.Soundtrack:
                        return 'Soundtrack';
                    case AlbumType.EP:
                        return 'EP';
                    case AlbumType.Single:
                        return 'Single';
                    default:
                        return 'unknown';
                }

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

            case 'linearType':
                switch (value) {
                    case LinearType.Ad:
                        return 'Ad';
                    case LinearType.MusicTrack:
                        return 'MusicTrack';
                    case LinearType.NonLinear:
                        return 'NonLinear';
                    case LinearType.OffAir:
                        return 'OffAir';
                    case LinearType.Show:
                        return 'Show';
                    case LinearType.Station:
                        return 'Station';
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
                    case PlaybackType.HLSMetadata:
                        return 'HLSMetadata';
                    case PlaybackType.Icecast:
                        return 'Icecast';
                    case PlaybackType.IcecastM3u:
                        return 'IcecastM3u';
                    case PlaybackType.IcecastOgg:
                        return 'IcecastOgg';
                    case PlaybackType.IFrame:
                        return 'IFrame';
                    default:
                        return 'unknown';
                }

            case 'addedAt':
            case 'modifiedAt':
            case 'playedAt':
                return value ? new Date(value * 1000).toLocaleString() : '';

            case 'releasedAt':
                return value ? new Date(value * 1000).toLocaleDateString() : '';

            case 'duration':
                return Math.abs(value) >= MAX_DURATION ? '–:––' : formatTime(value);

            case 'thumbnails':
                return `[${value?.length || 0}]`;

            default:
                return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
    }, []);

    return (
        <div className="media-details">
            <DetailsBox
                object={object as T}
                renderItem={renderItem}
                onSelect={setValue}
                title="Medial Details"
            />
            <p>
                <CopyButton disabled={value === undefined} onClick={handleCopyClick}>
                    Copy value
                </CopyButton>
                <CopyButton onClick={handleCopyAllClick}>Copy all</CopyButton>
            </p>
        </div>
    );
}
