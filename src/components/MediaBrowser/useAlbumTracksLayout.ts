import {useEffect, useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaSourceLayout from 'types/MediaSourceLayout';
import {uniq} from 'utils';

const defaultAlbumTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['AlbumTrack', 'Title', 'Artist', 'Duration'],
};

export default function useAlbumTracksLayout(
    album: MediaAlbum | null,
    preferredLayout = defaultAlbumTracksLayout
) {
    const [layout, setLayout] = useState<MediaSourceLayout<MediaItem>>(preferredLayout);

    useEffect(() => {
        if (album?.synthetic && preferredLayout.view === 'details') {
            const fields = preferredLayout.fields.slice();
            if (fields[0] === 'Track' || fields[0] === 'AlbumTrack') {
                fields[0] = 'Index';
            }
            const index = fields.indexOf('Duration');
            if (index !== -1) {
                fields.splice(index + 1, 0, 'Album', 'Year');
            }
            setLayout({view: 'details', fields: uniq(fields)});
        } else {
            setLayout(preferredLayout);
        }
    }, [album, preferredLayout]);

    return layout;
}
