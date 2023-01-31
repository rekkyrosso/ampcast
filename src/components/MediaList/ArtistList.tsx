import React from 'react';
import MediaArtist from 'types/MediaArtist';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaList, {MediaListProps} from './MediaList';

const defaultLayout: MediaSourceLayout<MediaArtist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Genre'],
};

export default function ArtistList({
    className = '',
    layout = defaultLayout,
    ...props
}: MediaListProps<MediaArtist>) {
    return <MediaList {...props} className={`artists ${className}`} layout={layout} />;
}
