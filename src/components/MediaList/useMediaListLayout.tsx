import React, {useMemo} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout, {Field} from 'types/MediaSourceLayout';
import {ColumnSpec, ListViewLayout} from 'components/ListView';
import Time from 'components/Time';
import {findBestThumbnail} from 'utils';

const defaultLayout: MediaSourceLayout<MediaObject> = {
    view: 'details',
    fields: ['Title', 'Genre', 'Owner'],
};

export default function useMediaListLayout<T extends MediaObject = MediaObject>(
    layout: MediaSourceLayout<T> = defaultLayout
): ListViewLayout<T> {
    return useMemo(() => createMediaListLayout(layout), [layout]);
}

export function createMediaListLayout<T extends MediaObject = MediaObject>(
    layout: MediaSourceLayout<T>
): ListViewLayout<T> {
    const {view, fields} = layout;
    const cols = fields.map((field) => mediaFields[field]);
    if (view === 'details') {
        return {view, cols, showTitles: true, sizeable: true};
    } else {
        return {view, cols};
    }
}

type MediaFields<T extends MediaObject = MediaObject> = Record<Field, ColumnSpec<T>>;
type RenderField<T extends MediaObject = MediaObject> = ColumnSpec<T>['render'];

export const Index: RenderField = (_, rowIndex) => rowIndex + 1;
export const Title: RenderField = (item) => item.title;
export const Track: RenderField<MediaItem> = (item) => item.track || '-';
export const Artist: RenderField<MediaAlbum | MediaItem> = (item) => item.artist;
export const Album: RenderField<MediaItem> = (item) => item.album;
export const Duration: RenderField<MediaPlaylist | MediaItem> = (item) => (
    <Time time={item.duration || 0} />
);
export const PlayCount: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) =>
    item.playCount || '';
export const TrackCount: RenderField<MediaPlaylist | MediaAlbum> = (item) => item.trackCount || '';
export const Year: RenderField<MediaAlbum | MediaItem> = (item) => item.year || '';
export const Genre: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) =>
    item.genre?.split(';').join(', ');
export const Owner: RenderField = (item) => item.owner?.name;

export const AlbumAndYear: RenderField<MediaItem> = (item) =>
    item.album ? (item.year ? `${item.album} (${item.year})` : item.album) : item.year || '';

export const Thumbnail: RenderField = (item) => {
    const thumbnail = findBestThumbnail(item.thumbnails);

    return (
        <div
            className="thumbnail-img"
            style={{
                backgroundImage: `url(${thumbnail.url})`,
            }}
        />
    );
};

// TODO: Revisit this.
// export function MediaActions<T extends MediaItem>(item: T) {
//     const save = useCallback(() => localMediaLibrary.add(item), [item]);
//     const unsave = useCallback(() => localMediaLibrary.remove(item), [item]);

//     return (
//         <IconButtons>
//             <IconButton
//                 className="with-overlay"
//                 icon={item.addedOn ? 'saved' : 'unsaved'}
//                 title={`${item.addedOn ? 'Remove from' : 'Add to'} local library`}
//                 onClick={item.addedOn ? unsave : save}
//             />
//         </IconButtons>
//     );
// }

// TODO: Improve typing.
const mediaFields: MediaFields<any> = {
    Index: {title: '#', render: Index, className: 'index', align: 'right', width: 60},
    Artist: {title: 'Artist', render: Artist, className: 'artist'},
    Title: {title: 'Title', render: Title, className: 'title'},
    Album: {title: 'Album', render: Album, className: 'album'},
    AlbumAndYear: {title: 'Album', render: AlbumAndYear, className: 'album'},
    Track: {title: 'Track', render: Track, align: 'right', width: 80, className: 'track'},
    Duration: {title: 'Time', render: Duration, align: 'right', width: 120, className: 'duration'},
    PlayCount: {
        title: 'Play Count',
        render: PlayCount,
        align: 'right',
        width: 120,
        className: 'play-count',
    },
    TrackCount: {
        title: 'Tracks',
        render: TrackCount,
        align: 'right',
        width: 120,
        className: 'track-count',
    },
    Year: {title: 'Year', render: Year, align: 'right', width: 120, className: 'year'},
    Genre: {title: 'Genre', render: Genre, className: 'genre'},
    Owner: {title: 'Owner', render: Owner, className: 'owner'},
    Thumbnail: {title: 'Thumbnail', render: Thumbnail, className: 'thumbnail'},
};
