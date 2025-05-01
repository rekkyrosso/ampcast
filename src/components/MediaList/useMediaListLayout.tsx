import React, {useMemo} from 'react';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout, {Field} from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import {getElapsedTimeText} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
import {performAction} from 'components/Actions';
import {ColumnSpec, ListViewLayout} from 'components/ListView';
import Actions from 'components/Actions';
import {ExplicitBadge} from 'components/Badges/Badge';
import CoverArt from 'components/CoverArt';
import Icon from 'components/Icon';
import Flag from 'components/Icon/Flag';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import StarRating from 'components/StarRating';
import SunClock from 'components/SunClock';
import Time from 'components/Time';
import usePager from 'hooks/usePager';
import useIsPlaylistPlayable from './useIsPlaylistPlayable';

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
    if (layout.view === 'none') {
        return {view: 'details', cols: []};
    }
    const {view, fields} = layout;
    const cols = fields.map((field) => mediaFields[field]);
    cols.push({
        id: '...',
        title: <Icon name="menu" />,
        render: (item: T) => <Actions item={item} inline />,
        className: 'actions',
        align: 'right',
        width: 5,
    });
    if (view === 'details') {
        return {view, cols, showTitles: true, sizeable: true};
    } else {
        return {view, cols};
    }
}

type MediaFields<T extends MediaObject = MediaObject> = Record<Field, ColumnSpec<T>>;
type RenderField<T extends MediaObject = MediaObject> = ColumnSpec<T>['render'];

const Index: RenderField = (_, rowIndex) => <Text value={rowIndex + 1} />;

const Title: RenderField = (item) => {
    return (
        <span className="title-with-badge">
            <span className="text">{item.title}</span>
            {item.itemType === ItemType.Media || item.itemType === ItemType.Album ? (
                <>
                    {' '}
                    <ExplicitBadge item={item} />
                </>
            ) : null}
        </span>
    );
};

const PlaylistTitle: RenderField = (item) => {
    const service = getServiceFromSrc(item);
    return service ? (
        <MediaSourceLabel icon={service.icon} text={item.title} />
    ) : (
        <Text value={item.title} />
    );
};

const Blurb: RenderField = (item) => <Text value={item.description} />;

const Location: RenderField<MediaItem> = ({radio: {country, location} = {}}) =>
    country ? (
        <span className="location-info">
            <Flag country={country} />
            <Text value={location} />
        </span>
    ) : null;

const Track: RenderField<MediaItem> = (item) => <Text value={item.track || '-'} />;

const AlbumTrack: RenderField<MediaItem> = (item) => (
    <span className="text">
        {item.track ? (
            <>
                <span className="disc">{item.disc || '?'}.</span>
                {item.track}
            </>
        ) : (
            '-'
        )}
    </span>
);

const Artist: RenderField<MediaAlbum | MediaItem> = (item) => (
    <Text value={item.itemType === ItemType.Media ? item.artists?.join(', ') : item.artist} />
);

const AlbumArtist: RenderField<MediaItem> = (item) => <Text value={item.albumArtist} />;

const Album: RenderField<MediaItem> = (item) => <Text value={item.album} />;

const Duration: RenderField<MediaPlaylist | MediaItem> = (item) => (
    <Time className="text" time={item.duration || 0} />
);

const PlayCount: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => (
    <Text value={getPlayCount(item.playCount)} />
);

const TrackCount: RenderField<MediaPlaylist | MediaAlbum> = (item) => (
    <Text value={getCount(item.trackCount)} />
);

const Year: RenderField<MediaAlbum | MediaItem> = (item) => <Text value={item.year || ''} />;

const Genre: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => (
    <Text value={item.genres?.join(', ')} />
);

const Owner: RenderField<MediaPlaylist | MediaItem> = (item) => <Text value={item.owner?.name} />;

const FileName: RenderField<MediaFolderItem> = (item) => <Text value={item.fileName} />;

const Views: RenderField = (item) => {
    if (item.globalPlayCount == null) {
        return null;
    }
    return <Text value={getGlobalPlayCount(item.globalPlayCount, 'view')} />;
};

const LastPlayed: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => {
    if (!item.playedAt) {
        return <span className="text">unplayed</span>;
    }
    if (item.src.endsWith(':listen:now-playing')) {
        return <span className="text">playing now</span>;
    }
    const date = new Date(item.playedAt * 1000);
    const elapsedTime = getElapsedTimeText(date.valueOf());
    return (
        <time className="text" title={date.toLocaleString()}>
            {elapsedTime}
        </time>
    );
};

const AddedAt: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => {
    if (!item.addedAt) {
        return null;
    }
    const date = new Date(item.addedAt * 1000);
    const elapsedTime = getElapsedTimeText(date.valueOf());
    return (
        <time className="text" title={date.toLocaleString()}>
            {elapsedTime}
        </time>
    );
};

const ListenDate: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => {
    if (!item.playedAt) {
        return '';
    }
    const time = item.playedAt * 1000;
    const date = new Date(time);
    return (
        <time className="text" title={date.toLocaleString()}>
            <SunClock time={time} />
            <span className="date">{date.toLocaleDateString()}</span>
        </time>
    );
};

const AlbumAndYear: RenderField<MediaItem> = (item) => (
    <Text
        value={item.album ? (item.year ? `${item.album} (${item.year})` : item.album) : item.year}
    />
);

const FileIcon: RenderField<MediaFolderItem> = (item: MediaFolderItem, rowIndex: number) => {
    const icon =
        item.itemType === ItemType.Media
            ? item.mediaType === MediaType.Video
                ? 'file-video'
                : 'file-audio'
            : rowIndex === 0 && item.fileName.startsWith('../')
            ? 'folder-up'
            : 'folder';
    return (
        <figure className="cover-art">
            <Icon className="cover-art-image" name={icon} />
        </figure>
    );
};

const Thumbnail: RenderField = (item) => {
    return <CoverArt item={item} />;
};

const Rate: RenderField = (item) => {
    return (
        <StarRating
            value={item.rating}
            tabIndex={-1}
            onChange={async (rating: number) => {
                await performAction(Action.Rate, [item], rating);
            }}
        />
    );
};

const Progress: RenderField<MediaPlaylist> = (playlist) => {
    const [{items}] = usePager(playlist.pager);
    const playlistSize = playlist.trackCount;
    const itemCount = items.reduce((total) => (total += 1), 0);
    const playable = useIsPlaylistPlayable(playlist);
    return playable ? null : (
        <progress
            max={playlistSize ?? 1}
            value={playlistSize == null ? 0 : itemCount}
            title={
                playlistSize == null
                    ? undefined
                    : `${Math.round((itemCount * 100) / playlistSize)}%`
            }
        />
    );
};

function Text({value = ''}: {value?: string | number}) {
    return value === '' ? null : <span className="text">{value}</span>;
}

// TODO: Improve typing.
const mediaFields: MediaFields<any> = {
    Index: {id: '#', title: '#', render: Index, className: 'index', align: 'right', width: 4},
    Artist: {id: 'artist', title: 'Artist', render: Artist, className: 'artist'},
    AlbumArtist: {
        id: 'albumArtist',
        title: 'Album Artist',
        render: AlbumArtist,
        className: 'artist',
    },
    AlbumTrack: {
        id: '#',
        title: '#',
        render: AlbumTrack,
        align: 'right',
        width: 4,
        className: 'index',
    },
    Title: {id: 'title', title: 'Title', render: Title, className: 'title'},
    PlaylistTitle: {id: 'title', title: 'Title', render: PlaylistTitle, className: 'title'},
    Blurb: {id: 'blurb', title: 'Description', render: Blurb, className: 'blurb'},
    Location: {id: 'location', title: 'Location', render: Location, className: 'location'},
    Album: {id: 'album', title: 'Album', render: Album, className: 'album'},
    AlbumAndYear: {id: 'albumAndYear', title: 'Album', render: AlbumAndYear, className: 'album'},
    Track: {
        id: 'track',
        title: 'Track',
        render: Track,
        align: 'right',
        width: 5,
        className: 'track',
    },
    Duration: {
        id: 'duration',
        title: 'Time',
        render: Duration,
        align: 'right',
        width: 8,
        className: 'duration',
    },
    FileIcon: {id: 'fileIcon', title: 'Thumbnail', render: FileIcon, className: 'thumbnail'},
    FileName: {id: 'fileName', title: 'FileName', render: FileName, className: 'title'},
    PlayCount: {
        id: 'playCount',
        title: 'Plays',
        render: PlayCount,
        align: 'right',
        width: 5,
        className: 'play-count',
    },
    TrackCount: {
        id: 'trackCount',
        title: 'Tracks',
        render: TrackCount,
        align: 'right',
        width: 8,
        className: 'track-count',
    },
    Year: {id: 'year', title: 'Year', render: Year, width: 8, className: 'year'},
    Views: {id: 'views', title: 'Views', render: Views, className: 'views'},
    Genre: {id: 'genre', title: 'Genre', render: Genre, className: 'genre'},
    Owner: {id: 'owner', title: 'Owner', render: Owner, className: 'owner'},
    AddedAt: {id: 'addedAt', title: 'Added', render: AddedAt, className: 'added-at'},
    LastPlayed: {
        id: 'lastPlayed',
        title: 'Last played',
        render: LastPlayed,
        className: 'played-at',
    },
    ListenDate: {
        id: 'listenDate',
        title: 'Played On',
        render: ListenDate,
        className: 'played-at listen-date',
    },
    Thumbnail: {id: 'thumbnail', title: 'Thumbnail', render: Thumbnail, className: 'thumbnail'},
    Rate: {
        id: 'rate',
        title: <StarRating value={0} tabIndex={-1} />,
        render: Rate,
        align: 'right',
        width: 8,
        className: 'rate',
    },
    Progress: {id: 'progress', title: 'Progress', render: Progress, className: 'progress'},
};

function getCount(count?: number): string {
    if (count == null) {
        return '';
    }
    const value = Number(count);
    return isNaN(value) ? '' : value.toLocaleString();
}

function getGlobalPlayCount(
    globalPlayCount = 0,
    countName = 'listen',
    countNamePlural = countName + 's'
): string {
    if (globalPlayCount === 1) {
        return `1 ${countName}`;
    } else {
        return `${getPlayCount(globalPlayCount)} ${countNamePlural}`;
    }
}

function getPlayCount(playCount = 0): string {
    if (playCount < 10_000) {
        return getCount(playCount);
    } else if (playCount < 100_000) {
        return `${(playCount / 1000).toFixed(1).replace('.0', '')}K`;
    } else if (playCount < 1_000_000) {
        return `${Math.round(playCount / 1000)}K`;
    } else if (playCount < 100_000_000) {
        return `${(playCount / 1_000_000).toFixed(1).replace('.0', '')}M`;
    } else if (playCount < 1_000_000_000) {
        return `${Math.round(playCount / 1_000_000)}M`;
    } else {
        return `${(playCount / 1_000_000_000).toFixed(1).replace('.0', '')}B`;
    }
}
