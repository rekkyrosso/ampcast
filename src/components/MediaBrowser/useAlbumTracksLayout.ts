import {useEffect, useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaSourceLayout from 'types/MediaSourceLayout';

const defaultAlbumTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['AlbumTrack', 'Title', 'Artist', 'Duration'],
};

const otherTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Title', 'Duration', 'Album', 'Track', 'Year'],
};

const videosLayout: MediaSourceLayout<MediaItem> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'Duration'],
};

export default function useAlbumTracksLayout(
    album: MediaAlbum | null,
    preferredLayout = defaultAlbumTracksLayout
) {
    const [layout, setLayout] = useState<MediaSourceLayout<MediaItem>>(preferredLayout);

    useEffect(() => {
        if (album?.synthetic && preferredLayout.view === 'details') {
            const [, type] = album.src.split(':');
            if (type === 'videos') {
                setLayout(videosLayout);
            } else {
                setLayout(otherTracksLayout);
            }
        } else {
            setLayout(preferredLayout);
        }
    }, [album, preferredLayout]);

    return layout;
}
