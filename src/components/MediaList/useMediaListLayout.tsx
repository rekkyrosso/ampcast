import React, {useMemo} from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout, {Field} from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import {ColumnSpec, ListViewLayout} from 'components/ListView';
import Actions from 'components/Actions';
import CoverArt from 'components/CoverArt';
import Icon from 'components/Icon';
import SunClock from 'components/SunClock';
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

function createMediaListLayout<T extends MediaObject = MediaObject>(
    layout: MediaSourceLayout<T>
): ListViewLayout<T> {
    const {view, fields} = layout;
    const cols = fields.map((field) => mediaFields[field]);
    cols.push({
        title: <Icon name="menu" />,
        render: (item: T) => <Actions item={item} inline />,
        className: 'actions',
        align: 'right',
        width: 80,
    });
    if (view === 'details') {
        return {view, cols, showTitles: true, sizeable: true};
    } else {
        return {view, cols};
    }
}

type MediaFields<T extends MediaObject = MediaObject> = Record<Field, ColumnSpec<T>>;
type RenderField<T extends MediaObject = MediaObject> = ColumnSpec<T>['render'];

export const Index: RenderField = (_, rowIndex) => rowIndex + 1;

export const Title: RenderField = (item) => <Text value={item.title} />;

export const Blurb: RenderField<MediaPlaylist> = (item) => <Text value={item.description} />;

export const Track: RenderField<MediaItem> = (item) => <Text value={item.track || '-'} />;

export const Artist: RenderField<MediaAlbum | MediaItem> = (item) => (
    <Text value={item.itemType === ItemType.Media ? item.artists?.join(', ') : item.artist} />
);

export const AlbumArtist: RenderField<MediaItem> = (item) => <Text value={item.albumArtist} />;

export const Album: RenderField<MediaItem> = (item) => <Text value={item.album} />;

export const Duration: RenderField<MediaPlaylist | MediaItem> = (item) => (
    <Time className="text" time={item.duration || 0} />
);

export const PlayCount: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => (
    <Text value={getCount(item.playCount)} />
);

export const TrackCount: RenderField<MediaPlaylist | MediaAlbum> = (item) => (
    <Text value={getCount(item.trackCount)} />
);

export const Year: RenderField<MediaAlbum | MediaItem> = (item) => <Text value={item.year} />;

export const Genre: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => (
    <Text value={item.genres?.join(', ')} />
);

export const Owner: RenderField = (item) => <Text value={item.owner?.name} />;

export const Views: RenderField = (item) => {
    if (item.globalPlayCount === undefined) {
        return null;
    }
    if (item.itemType !== ItemType.Media) {
        return null;
    }
    if (item.mediaType !== MediaType.Video) {
        return null;
    }
    return <Text value={getGlobalPlayCount(item.globalPlayCount, 'view')} />;
};

export const LastPlayed: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => {
    if (!item.playedAt) {
        return '';
    }
    const date = new Date(item.playedAt * 1000);
    const elapsedTime = getElapsedTimeText(date.valueOf());
    return (
        <time className="text last-played" title={date.toLocaleDateString()}>
            {elapsedTime}
        </time>
    );
};

export const ListenDate: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => {
    if (!item.playedAt) {
        return '';
    }
    const time = item.playedAt * 1000;
    return (
        <time className="text listen-date">
            <SunClock time={time} />
            <span>{new Date(time).toLocaleDateString()}</span>
        </time>
    );
};

export const AlbumAndYear: RenderField<MediaItem> = (item) => (
    <Text
        value={item.album ? (item.year ? `${item.album} (${item.year})` : item.album) : item.year}
    />
);

export const Thumbnail: RenderField = (item) => {
    return <CoverArt item={item} />;
};

function Text({value = ''}: {value?: string | number}) {
    return value === '' ? null : <span className="text">{value}</span>;
}

// TODO: Improve typing.
const mediaFields: MediaFields<any> = {
    Index: {title: '#', render: Index, className: 'index', align: 'right', width: 60},
    Artist: {title: 'Artist', render: Artist, className: 'artist'},
    AlbumArtist: {title: 'Album Artist', render: AlbumArtist, className: 'artist'},
    Title: {title: 'Title', render: Title, className: 'title'},
    Blurb: {title: 'Description', render: Blurb, className: 'blurb'},
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
    Year: {title: 'Year', render: Year, width: 120, className: 'year'},
    Views: {title: 'Views', render: Views, className: 'views'},
    Genre: {title: 'Genre', render: Genre, className: 'genre'},
    Owner: {title: 'Owner', render: Owner, className: 'owner'},
    LastPlayed: {title: 'Last played', render: LastPlayed, className: 'played-at'},
    ListenDate: {title: 'Played On', render: ListenDate, className: 'played-at'},
    Thumbnail: {title: 'Thumbnail', render: Thumbnail, className: 'thumbnail'},
};

function getCount(count?: number): string {
    if (count == null) {
        return '';
    }
    const value = Number(count);
    return isNaN(value) ? '' : value.toLocaleString();
}

function getElapsedTimeText(playedAt: number): string {
    const elapsedTime = Date.now() - playedAt;
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
}

function getGlobalPlayCount(
    globalPlayCount = 0,
    countName = 'listen',
    countNamePlural = countName + 's'
): string {
    if (globalPlayCount === 1) {
        return `1 ${countName}`;
    } else if (globalPlayCount < 1_000) {
        return `${globalPlayCount} ${countNamePlural}`;
    } else if (globalPlayCount < 100_000) {
        return `${(globalPlayCount / 1000).toFixed(1).replace('.0', '')}K  ${countNamePlural}`;
    } else if (globalPlayCount < 1_000_000) {
        return `${Math.round(globalPlayCount / 1000)}K  ${countNamePlural}`;
    } else if (globalPlayCount < 100_000_000) {
        return `${(globalPlayCount / 1_000_000).toFixed(1).replace('.0', '')}M  ${countNamePlural}`;
    } else if (globalPlayCount < 1_000_000_000) {
        return `${Math.round(globalPlayCount / 1_000_000)}M  ${countNamePlural}`;
    } else {
        return `${(globalPlayCount / 1_000_000_000)
            .toFixed(1)
            .replace('.0', '')}M  ${countNamePlural}`;
    }
}
