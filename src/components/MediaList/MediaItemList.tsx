import React, {useCallback} from 'react';
import MediaItem from 'types/MediaItem';
import MediaSourceLayout from 'types/MediaSourceLayout';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import MediaList, {MediaListProps} from './MediaList';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount'],
};

export default function MediaItemList({
    className = '',
    layout = defaultLayout,
    ...props
}: MediaListProps<MediaItem>) {
    const currentlyPlaying = useCurrentlyPlaying();

    const itemClassName = useCallback(
        (item: MediaItem) => {
            const [source] = item.src.split(':');
            const playing = item.src === currentlyPlaying?.src ? 'playing' : '';
            const unplayable = item.unplayable ? 'unplayable' : '';
            return `source-${source} ${playing} ${unplayable}`;
        },
        [currentlyPlaying]
    );

    return (
        <MediaList
            {...props}
            className={`media-items ${className}`}
            itemClassName={itemClassName}
            layout={layout}
            multiSelect={true}
            draggable={true}
        />
    );
}
