import React, {useMemo} from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout, {Field} from 'types/MediaSourceLayout';
import {ColumnSpec, ListViewLayout} from 'components/ListView';
import ThumbnailImage from 'components/ThumbnailImage';
import Time from 'components/Time';

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
export const LastPlayed: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => {
    if (!item.playedAt) {
        return '';
    }
    const elapsedTime = Date.now() - item.playedAt * 1000;
    const minute = 60_000;
    if (elapsedTime < minute * 2) {
        return 'just now';
    }
    const hour = 60 * minute;
    if (elapsedTime < hour * 1.5) {
        return `${Math.round(elapsedTime / minute)} mins ago`;
    }
    const day = 24 * hour;
    if (elapsedTime < day * 1.5) {
        return `${Math.round(elapsedTime / hour)} hours ago`;
    }
    if (elapsedTime < day * 12) {
        return `${Math.round(elapsedTime / day)} days ago`;
    }
    const week = 7 * day;
    if (elapsedTime < week * 10) {
        return `${Math.round(elapsedTime / week)} weeks ago`;
    }
    const month = 30 * day;
    const year = 365 * day;
    if (elapsedTime < year) {
        return `${Math.round(elapsedTime / month)} months ago`;
    }
    if (elapsedTime < 2 * year) {
        return `1 year ago`;
    }
    return `${Math.floor(elapsedTime / year)} years ago`;
};

export const ListenDate: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => {
    if (!item.playedAt) {
        return '';
    }
    return new Date(item.playedAt * 1000).toLocaleDateString();
};

export const AlbumAndYear: RenderField<MediaItem> = (item) =>
    item.album ? (item.year ? `${item.album} (${item.year})` : item.album) : item.year || '';

export const Thumbnail: RenderField = (item) => {
    return (
        <ThumbnailImage
            thumbnails={item.thumbnails}
            fallbackIcon={item.itemType === ItemType.Artist ? 'person' : undefined}
        />
    );
};

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
    LastPlayed: {title: 'Last played', render: LastPlayed, className: 'played-at'},
    ListenDate: {title: 'Played On', render: ListenDate, className: 'played-at'},
    Thumbnail: {title: 'Thumbnail', render: Thumbnail, className: 'thumbnail'},
};
