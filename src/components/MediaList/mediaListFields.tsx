import React from 'react';
import {Except} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import {Field} from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import {getElapsedTimeText} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
import {ColumnSpec} from 'components/ListView';
import {performAction} from 'components/Actions';
import {Badge, BitRateBadge, ExplicitBadge, LivePlaybackBadge} from 'components/Badges';
import CoverArt from 'components/CoverArt';
import Icon, {IconName, Flag} from 'components/Icon';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import ScrobblingOptions from 'components/MediaInfo/ScrobblingOptions';
import StarRating from 'components/StarRating';
import SunClock from 'components/SunClock';
import Time from 'components/Time';
import usePager from 'hooks/usePager';

export type FieldSpec = Except<ColumnSpec<any>, 'id'> & {id: Field};

type RenderField<T extends MediaObject = MediaObject> = ColumnSpec<T>['render'];

const Index: RenderField = (_, info) => <Text value={info.rowIndex + 1} />;

const Title: RenderField = (item) => {
    return (
        <span className="title-with-badge">
            <span className="text">{item.title}</span>
            {item.itemType === ItemType.Media && item.isLivePlayback ? (
                <>
                    {' '}
                    <LivePlaybackBadge item={item} />
                </>
            ) : null}
            {item.itemType === ItemType.Media || item.itemType === ItemType.Album ? (
                <>
                    {' '}
                    <ExplicitBadge item={item} />
                </>
            ) : null}
        </span>
    );
};

export const IconTitle: RenderField = (item, info) => {
    const [serviceId] = item.src.split(':');
    let icon: IconName;
    if (
        /^https?/.test(item.src) &&
        item.itemType === ItemType.Media &&
        item.linearType === LinearType.Station
    ) {
        icon = 'internet-radio';
    } else {
        icon = serviceId as IconName;
    }
    return <MediaSourceLabel icon={icon} text={Title(item, info)} />;
};

const BitRate: RenderField<MediaItem> = (item) => <Text value={item.bitRate} />;

const Container: RenderField<MediaItem> = (item) => <Text value={item.badge} />;

const Description: RenderField = (item) => <Text value={item.description} />;

const Track: RenderField<MediaItem> = (item) => (
    <span className="text">
        {item.track ? (
            <>
                <span className={`disc ${item.disc ? '' : 'disc-empty'}`}>{item.disc || '?'}.</span>
                {item.track}
            </>
        ) : (
            '-'
        )}
    </span>
);

const Disc: RenderField<MediaItem> = (item) => <Text value={item.disc} />;

const MultiDisc: RenderField<MediaAlbum> = (item) => <Text value={item.multiDisc} />;

const Copyright: RenderField<MediaAlbum | MediaItem> = (item) => <Text value={item.copyright} />;

const Position: RenderField = (item) => <Text value={item.position || '-'} />;

const Artist: RenderField<MediaAlbum | MediaItem> = (item) => (
    <Text value={item.itemType === ItemType.Media ? item.artists?.join(', ') : item.artist} />
);

const Album: RenderField<MediaItem> = (item) => <Text value={item.album} />;

const AlbumArtist: RenderField<MediaItem> = (item) => <Text value={item.albumArtist} />;

const AlbumType: RenderField<MediaAlbum> = (album) => {
    return <Text value={album.albumType ? album.albumType : ''} />;
};

const Duration: RenderField<MediaPlaylist | MediaItem> = (item) => (
    <Time className="text" time={item.duration || 0} asDuration />
);

const PlayCount: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => (
    <Text value={getCountString(item.playCount)} />
);

const TrackCount: RenderField<MediaPlaylist | MediaAlbum> = (item) => (
    <Text value={getCount(item.trackCount)} />
);

const Year: RenderField<MediaAlbum | MediaItem> = (item) => <Text value={item.year || ''} />;

const Genre: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => {
    let genres = item.genres;
    if (genres?.length) {
        if (genres.length === 1) {
            genres = genres[0].split(/\s*[,;/]\s*/);
        }
        return <Text value={genres.slice(0, 10).join(', ')} />;
    } else {
        return null;
    }
};
const Owner: RenderField<MediaPlaylist | MediaItem> = (item) => <Text value={item.owner?.name} />;

const FileName: RenderField<MediaFolderItem> = (item) => <Text value={item.fileName} />;

const Views: RenderField = (item) => {
    if (item.globalPlayCount == null) {
        return null;
    }
    return <Text value={getCountStringWithLabel(item.globalPlayCount, 'view')} />;
};

const LastPlayed: RenderField<MediaPlaylist | MediaAlbum | MediaItem> = (item) => {
    if (!item.playedAt) {
        return;
    }
    if (item.playedAt === -1) {
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

const ModifiedAt: RenderField<MediaPlaylist> = (item) => {
    if (!item.modifiedAt) {
        return null;
    }
    const date = new Date(item.modifiedAt * 1000);
    const elapsedTime = getElapsedTimeText(date.valueOf());
    return (
        <time className="text" title={date.toLocaleString()}>
            {elapsedTime}
        </time>
    );
};

const Released: RenderField<MediaAlbum> = (item) => {
    if (!item.releasedAt) {
        return null;
    }
    const date = new Date(item.releasedAt * 1000);
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
            <span className="date-text">{date.toLocaleDateString()}</span>
        </time>
    );
};

const AlbumAndYear: RenderField<MediaItem> = (item) => (
    <Text
        value={
            item.album ? (item.year ? `${item.album} (${item.year})` : item.album) : item.year || ''
        }
    />
);

const FileIcon: RenderField<MediaFolderItem> = (item: MediaFolderItem, info) => {
    const icon =
        item.itemType === ItemType.Media
            ? item.mediaType === MediaType.Video
                ? 'file-video'
                : 'file-audio'
            : info.rowIndex === 0 && item.fileName.startsWith('../')
              ? 'folder-up'
              : 'folder';
    return (
        <figure className="cover-art">
            <Icon className="cover-art-image" name={icon} />
        </figure>
    );
};

const Thumbnail: RenderField = (item, info) => {
    return <CoverArt item={item} placeholder={info.busy} />;
};

const Rating: RenderField = (item) => {
    const service = getServiceFromSrc(item);
    return service?.canRate?.(item) ? (
        <StarRating
            value={item.rating}
            increment={service.starRatingIncrement}
            tabIndex={-1}
            onChange={(rating: number) => {
                performAction(Action.Rate, [item], rating);
            }}
        />
    ) : null;
};

const Progress: RenderField<MediaPlaylist> = (playlist) => {
    const [{items, complete}] = usePager(playlist.pager);
    const playlistSize = playlist.trackCount;
    const itemCount = items.reduce((total) => (total += 1), 0);
    return complete || playlistSize === 0 ? null : (
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

const Badges: RenderField<MediaItem> = (item) => {
    return (
        <div className="badges">
            <BitRateBadge item={item} />
            {item.badge ? <Badge>{item.badge}</Badge> : null}
        </div>
    );
};

export const Country: RenderField<MediaItem | MediaArtist> = (item) => {
    return item.country && item.countryCode ? (
        <>
            <Flag country={item.countryCode} />
            <Text value={item.country} />
        </>
    ) : (
        <Text value={item.country} />
    );
};

const ScrobbleStatus: RenderField<MediaItem> = (item) => {
    return (
        <ul>
            <li>
                <ScrobblingOptions item={item} scrobblerId="lastfm" />
            </li>
            <li>
                <ScrobblingOptions item={item} scrobblerId="listenbrainz" />
            </li>
        </ul>
    );
};

function Text({value = ''}: {value?: string | number | boolean}) {
    return value === '' || value == null ? null : <span className="text">{value}</span>;
}

const mediaListFields: Record<Field, FieldSpec> = {
    Index: {
        id: 'Index',
        title: 'Index',
        render: Index,
        align: 'right',
        width: 4,
        className: 'index',
        unsortable: true,
    },
    Track: {
        id: 'Track',
        title: 'Track',
        render: Track,
        align: 'right',
        width: 5,
        className: 'index track',
    },
    Disc: {
        id: 'Disc',
        title: 'Disc',
        render: Disc,
        align: 'right',
        width: 4,
        className: 'disc',
    },
    Position: {
        id: 'Position',
        title: 'Position',
        render: Position,
        align: 'right',
        width: 4,
        className: 'index position',
    },
    Artist: {
        id: 'Artist',
        title: 'Artist',
        render: Artist,
        className: 'artist',
    },
    AlbumArtist: {
        id: 'AlbumArtist',
        title: 'Album Artist',
        render: AlbumArtist,
        className: 'artist',
    },
    Title: {id: 'Title', title: 'Title', render: Title, className: 'title'},
    Name: {id: 'Name', title: 'Name', render: Title, className: 'title'},
    FileName: {id: 'FileName', title: 'FileName', render: FileName, className: 'title'},
    IconTitle: {
        id: 'IconTitle',
        title: 'Title',
        render: IconTitle,
        className: 'title',
    },
    Description: {
        id: 'Description',
        title: 'Description',
        render: Description,
        className: 'description',
    },
    Album: {id: 'Album', title: 'Album', render: Album, className: 'album'},
    AlbumType: {
        id: 'AlbumType',
        title: 'Type',
        render: AlbumType,
        className: 'album-type',
    },
    AlbumAndYear: {
        id: 'AlbumAndYear',
        title: 'Album',
        render: AlbumAndYear,
        className: 'album',
    },
    Duration: {
        id: 'Duration',
        title: 'Time',
        render: Duration,
        align: 'right',
        width: 5,
        className: 'duration',
    },
    FileIcon: {
        id: 'FileIcon',
        title: 'Thumbnail',
        render: FileIcon,
        className: 'thumbnail',
        unsortable: true,
    },
    PlayCount: {
        id: 'PlayCount',
        title: 'Plays',
        render: PlayCount,
        align: 'right',
        width: 5,
        className: 'play-count count',
    },
    TrackCount: {
        id: 'TrackCount',
        title: 'Tracks',
        render: TrackCount,
        align: 'right',
        width: 8,
        className: 'track-count count',
    },
    Year: {
        id: 'Year',
        title: 'Year',
        render: Year,
        align: 'right',
        width: 5,
        className: 'year',
    },
    Views: {
        id: 'Views',
        title: 'Views',
        render: Views,
        className: 'views count',
    },
    Genre: {id: 'Genre', title: 'Genre', render: Genre, width: 10, className: 'genre'},
    Owner: {id: 'Owner', title: 'Owner', render: Owner, className: 'owner'},
    BitRate: {
        id: 'BitRate',
        title: 'BitRate',
        render: BitRate,
        align: 'right',
        width: 6,
        className: 'bitrate',
    },
    Container: {
        id: 'Container',
        title: 'Container',
        render: Container,
        width: 6,
        className: 'container',
    },
    Copyright: {
        id: 'Copyright',
        title: 'Copyright',
        render: Copyright,
        className: 'copyright',
    },
    AddedAt: {
        id: 'AddedAt',
        title: 'Added',
        render: AddedAt,
        align: 'right',
        className: 'added-at date',
    },
    ModifiedAt: {
        id: 'ModifiedAt',
        title: 'Modified',
        render: ModifiedAt,
        align: 'right',
        className: 'modified-at date',
    },
    Released: {
        id: 'Released',
        title: 'Released',
        render: Released,
        align: 'right',
        className: 'released-at date',
    },
    LastPlayed: {
        id: 'LastPlayed',
        title: 'Last played',
        render: LastPlayed,
        align: 'right',
        className: 'played-at date',
    },
    ListenDate: {
        id: 'ListenDate',
        title: 'Played On',
        render: ListenDate,
        align: 'right',
        className: 'listen-date date',

        width: 9,
    },
    MultiDisc: {
        id: 'MultiDisc',
        title: 'Multi Disc',
        render: MultiDisc,
        className: 'multi-disc',
    },
    Thumbnail: {
        id: 'Thumbnail',
        title: 'Thumbnail',
        render: Thumbnail,
        className: 'thumbnail',
        unsortable: true,
    },
    Rating: {
        id: 'Rating',
        title: <StarRating value={0} tabIndex={-1} />,
        render: Rating,
        align: 'right',
        width: 8,
        className: 'rating',
    },
    Progress: {
        id: 'Progress',
        title: 'Progress',
        render: Progress,
        className: 'progress',
        width: 8,
        unsortable: true,
    },
    Badges: {
        id: 'Badges',
        title: 'Badges',
        render: Badges,
        className: 'inline-badges',
        unsortable: true,
    },
    Country: {
        id: 'Country',
        title: 'Country',
        render: Country,
        className: 'country',
    },
    ScrobbleStatus: {
        id: 'ScrobbleStatus',
        title: 'Status',
        render: ScrobbleStatus,
        className: 'scrobble-status',
        width: 32,
        unsortable: true,
    },
};

export default mediaListFields;

function getCount(count?: number): string {
    if (count == null) {
        return '';
    }
    const value = Number(count);
    return isNaN(value) ? '' : value.toLocaleString();
}

function getCountString(count = 0): string {
    if (count < 10_000) {
        return getCount(count);
    } else if (count < 100_000) {
        return `${(count / 1000).toFixed(1).replace('.0', '')}K`;
    } else if (count < 1_000_000) {
        return `${Math.round(count / 1000)}K`;
    } else if (count < 100_000_000) {
        return `${(count / 1_000_000).toFixed(1).replace('.0', '')}M`;
    } else if (count < 1_000_000_000) {
        return `${Math.round(count / 1_000_000)}M`;
    } else {
        return `${(count / 1_000_000_000).toFixed(1).replace('.0', '')}B`;
    }
}

function getCountStringWithLabel(count = 0, label: string, labelPlural = label + 's'): string {
    if (count === 1) {
        return `1 ${label}`;
    } else {
        return `${getCountString(count)} ${labelPlural}`;
    }
}
