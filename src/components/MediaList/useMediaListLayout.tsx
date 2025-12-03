import React, {useMemo} from 'react';
import {SetRequired} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaListLayout, {Field} from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import {exists, getElapsedTimeText, uniq} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
import {setSourceFields} from 'services/mediaServices/servicesSettings';
import {ColumnSpec, ListViewLayout} from 'components/ListView';
import DefaultActions, {ActionsProps, performAction} from 'components/Actions';
import {ExplicitBadge, getAlbumTypeText, LivePlaybackBadge} from 'components/Badges';
import CoverArt from 'components/CoverArt';
import Icon, {IconName} from 'components/Icon';
import PopupMenuButton from 'components/Button/PopupMenuButton';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import StarRating from 'components/StarRating';
import SunClock from 'components/SunClock';
import Time from 'components/Time';
import usePager from 'hooks/usePager';
import useIsPlaylistPlayable from 'hooks/useIsPlaylistPlayable';
import useMediaListFields from './useMediaListFields';
import useMediaListView from './useMediaListView';
import showDetailsMenu from './showDetailsMenu';
import {showEditFieldsDialog} from './EditFieldsDialog';

export type FieldSpec = SetRequired<ColumnSpec<any>, 'id'>;

export default function useMediaListLayout<T extends MediaObject = MediaObject>(
    listId: string,
    defaultLayout: MediaListLayout,
    layoutOptions?: Partial<MediaListLayout>,
    Actions: React.FC<ActionsProps> = DefaultActions,
    parentPlaylist?: MediaPlaylist
): ListViewLayout<T> {
    const view = useMediaListView(listId);
    const fields = useMediaListFields(listId);
    return useMemo(() => {
        let extraFields: Field[] = [
            'Index',
            ...(layoutOptions?.details || defaultLayout.details),
            ...(defaultLayout.extraFields || []),
        ];
        if (extraFields.includes('IconTitle')) {
            extraFields = extraFields.map((field) => (field === 'Title' ? 'IconTitle' : field));
        } else if (extraFields.includes('Name')) {
            extraFields = extraFields.map((field) => (field === 'Title' ? 'Name' : field));
        }
        extraFields = uniq(extraFields);
        return createMediaListLayout(
            listId,
            {
                view: view || layoutOptions?.view || defaultLayout.view,
                card: layoutOptions?.card || defaultLayout.card,
                details: fields || layoutOptions?.details || defaultLayout.details,
                extraFields,
            },
            Actions,
            parentPlaylist
        );
    }, [listId, view, fields, defaultLayout, layoutOptions, Actions, parentPlaylist]);
}

function createMediaListLayout<T extends MediaObject = MediaObject>(
    listId: string,
    layout: MediaListLayout,
    Actions: React.FC<ActionsProps>,
    parentPlaylist?: MediaPlaylist
): ListViewLayout<T> {
    if (layout.view === 'none') {
        return {view: 'details', cols: []};
    }
    const actions: FieldSpec = {
        id: 'Actions',
        title: 'Actions',
        render: (item: T) => <Actions item={item} inListView parentPlaylist={parentPlaylist} />,
        className: 'actions',
        align: 'right',
        width: 5,
    };
    const {view, card} = layout;
    if (view === 'details') {
        const handleContextMenu = async (event: React.MouseEvent) => {
            event.preventDefault();
            await showPopupMenu(event.target as HTMLElement, event.pageX, event.pageY);
        };
        const showPopupMenu = async (
            target: HTMLElement,
            x: number,
            y: number,
            align: 'left' | 'right' = 'left'
        ) => {
            const result = await showDetailsMenu(target, x, y, align);
            if (result === 'edit-fields') {
                const newFields = await showEditFieldsDialog(visibleFields, hiddenFields);
                if (newFields) {
                    setSourceFields(listId, newFields);
                }
            }
        };
        const getFields = (fields: readonly Field[] = []): FieldSpec[] =>
            fields
                .map((field) => mediaFields[field])
                .filter(exists)
                .filter((col) => col.className !== 'thumbnail');
        const visibleFields = getFields(layout.details);
        const allFields: readonly FieldSpec[] = uniq([
            mediaFields.Index,
            ...visibleFields,
            ...getFields(layout.extraFields),
        ]);
        const hiddenFields = allFields.filter((field) => !visibleFields.includes(field));
        (actions as any).title = (
            <PopupMenuButton
                title="Options…"
                tabIndex={-1}
                showPopup={async (button: HTMLButtonElement) => {
                    const {right, bottom} = button.getBoundingClientRect();
                    await showPopupMenu(button, right, bottom + 4);
                }}
            />
        );
        const cols = visibleFields
            .concat(actions)
            .map((col) => ({...col, onContextMenu: handleContextMenu}));
        if (/\bindex\b/.test(cols[0].className!)) {
            cols[0] = {...cols[0], title: '#'};
        }
        return {view, cols, showTitles: true, sizeable: true};
    } else {
        const getField = (field: Field | undefined, className: string): FieldSpec | undefined => {
            if (field) {
                const col = mediaFields[field];
                return {...col, className: `${col.className} ${className}`};
            }
        };
        return {
            view,
            cols: [
                card.index ? mediaFields[card.index] : undefined,
                mediaFields[card.thumb || 'Thumbnail'],
                getField(card.h1 || 'Title', 'h1'),
                getField(card.h2, 'h2'),
                getField(card.h3, 'h3'),
                getField(card.data, 'data'),
                actions,
            ].filter(exists),
        };
    }
}

type MediaFields = Record<Field, FieldSpec>;
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

const IconTitle: RenderField = (item) => {
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
    return <MediaSourceLabel icon={icon} text={item.title} />;
};

const BitRate: RenderField<MediaItem> = (item) => <Text value={item.bitRate} />;

const Container: RenderField<MediaItem> = (item) => <Text value={item.badge} />;

const Description: RenderField = (item) => <Text value={item.description} />;

const Track: RenderField<MediaItem> = (item) => (
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

const Disc: RenderField<MediaItem> = (item) => <Text value={item.disc} />;

const MultiDisc: RenderField<MediaAlbum> = (item) => <Text value={item.multiDisc} />;

const Copyright: RenderField<MediaAlbum | MediaItem> = (item) => <Text value={item.copyright} />;

const Position: RenderField<MediaItem> = (item) => <Text value={item.position || '-'} />;

const Artist: RenderField<MediaAlbum | MediaItem> = (item) => (
    <Text value={item.itemType === ItemType.Media ? item.artists?.join(', ') : item.artist} />
);

const Album: RenderField<MediaItem> = (item) => <Text value={item.album} />;

const AlbumArtist: RenderField<MediaItem> = (item) => <Text value={item.albumArtist} />;

const AlbumType: RenderField<MediaAlbum> = (album) => {
    return <Text value={album.albumType ? getAlbumTypeText(album.albumType) : ''} />;
};

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
        return;
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
    const [{items}] = usePager(playlist.pager);
    const playlistSize = playlist.trackCount;
    const itemCount = items.reduce((total) => (total += 1), 0);
    const playable = useIsPlaylistPlayable(playlist);
    return playable || playlistSize === 0 ? null : (
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

function Text({value = ''}: {value?: string | number | boolean}) {
    return value === '' || value == null ? null : <span className="text">{value}</span>;
}

const mediaFields: MediaFields = {
    Index: {
        id: 'Index',
        title: 'Index',
        render: Index,
        align: 'right',
        width: 4,
        className: 'index',
    },
    Track: {
        id: 'Track',
        title: 'Track',
        render: Track,
        align: 'right',
        width: 4,
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
    Artist: {id: 'Artist', title: 'Artist', render: Artist, className: 'artist'},
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
    Year: {id: 'Year', title: 'Year', render: Year, align: 'right', width: 5, className: 'year'},
    Views: {id: 'Views', title: 'Views', render: Views, className: 'views count'},
    Genre: {id: 'Genre', title: 'Genre', render: Genre, width: 10, className: 'genre'},
    Owner: {id: 'Owner', title: 'Owner', render: Owner, className: 'owner'},
    BitRate: {
        id: 'BitRate',
        title: 'BitRate',
        render: BitRate,
        align: 'right',
        width: 5,
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
    },
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
