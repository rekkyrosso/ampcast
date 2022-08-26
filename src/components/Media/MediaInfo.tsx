import React from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {findBestThumbnail, formatTime} from 'utils';
import Icon, {MediaSourceIconName} from 'components/Icon';
import './MediaInfo.scss';

export interface MediaInfoProps<T extends MediaObject> {
    item: T;
}

export default function MediaInfo<T extends MediaObject>({item}: MediaInfoProps<T>) {
    switch (item.itemType) {
        case ItemType.Media:
            return <MediaItemInfo item={item} />;

        case ItemType.Artist:
            return <ArtistInfo item={item} />;

        case ItemType.Album:
            return <AlbumInfo item={item} />;

        case ItemType.Playlist:
            return <PlaylistInfo item={item} />;
    }
}

function MediaItemInfo({item}: MediaInfoProps<MediaItem>) {
    return (
        <article className="media-info media-item-info">
            <div className="media-info-main">
                <Thumbnail thumbnails={item.thumbnails} />
                <Title title={item.title} />
                <Artist artist={item.artist} />
                <AlbumAndYear album={item.album} year={item.year} />
                <Owner owner={item.owner} src={item.src} />
            </div>
            <ExternalLink url={item.externalUrl} src={item.src} />
        </article>
    );
}

function AlbumInfo({item: album}: MediaInfoProps<MediaAlbum>) {
    return (
        <article className="media-info album-info">
            <div className="media-info-main">
                <Thumbnail thumbnails={album.thumbnails} />
                <Title title={album.title} />
                <Artist artist={album.artist} />
                <Year year={album.year} />
            </div>
            <ExternalLink url={album.externalUrl} src={album.src} />
        </article>
    );
}

function ArtistInfo({item: artist}: MediaInfoProps<MediaArtist>) {
    return (
        <article className="media-info artist-info">
            <div className="media-info-main">
                <Thumbnail thumbnails={artist.thumbnails} />
                <Title title={artist.title} />
            </div>
            <ExternalLink url={artist.externalUrl} src={artist.src} />
        </article>
    );
}

function PlaylistInfo({item}: MediaInfoProps<MediaPlaylist>) {
    return (
        <article className="media-info playlist-info">
            <div className="media-info-main">
                <Thumbnail thumbnails={item.thumbnails} />
                <Title title={item.title} />
                <Owner owner={item.owner} src={item.src} />
            </div>
            <ExternalLink url={item.externalUrl} src={item.src} />
        </article>
    );
}

export function Title<T extends MediaObject>({title}: Pick<T, 'title'>) {
    return <h3 className="title">{title || '(no title)'}</h3>;
}

export function Artist<T extends MediaItem>({artist}: Pick<T, 'artist'>) {
    return artist ? <h4 className="artist">By: {artist}</h4> : null;
}

export function Owner<T extends MediaObject>({src, owner}: Pick<T, 'src' | 'owner'>) {
    if (!owner) {
        return null;
    }

    const [source] = src.split(':');
    let label = 'Owner';

    switch (source) {
        case 'youtube':
            label = 'Channel';
            break;

        default:
            return null;
    }

    return (
        <p className="owner">
            {label}:{' '}
            <a href={owner.url} target={`ampcast-${source}`}>
                {owner.name}
            </a>
        </p>
    );
}

export function ExternalLink({src, url}: {src: string; url: string | undefined}) {
    if (!url) {
        return null;
    }

    const [source] = src.split(':');
    let name = '';

    switch (source) {
        case 'apple':
            name = 'Apple Music';
            break;

        case 'spotify':
            name = 'Spotify';
            break;

        case 'youtube':
            name = 'YouTube';
            break;

        case 'lastfm':
            name = 'last.fm';
            break;
    }

    return (
        <p className="external-view">
            {name ? (
                <>
                    View on {name}: <Icon name={source as MediaSourceIconName} />{' '}
                </>
            ) : (
                <>Url: </>
            )}

            <a href={url} target={`ampcast-${source}`}>
                {url}
            </a>
        </p>
    );
}

export function AlbumAndYear<T extends MediaItem>({album, year}: Pick<T, 'album' | 'year'>) {
    if (album && year) {
        return (
            <h4 className="album">
                From: {album} ({year})
            </h4>
        );
    } else if (album) {
        return <h4 className="album">From: {album}</h4>;
    } else if (year) {
        return <h4 className="album">Year: {year}</h4>;
    } else {
        return null;
    }
}

export function Year<T extends MediaItem>({year}: Pick<T, 'year'>) {
    if (year) {
        return <p className="year">Year: {year}</p>;
    } else {
        return null;
    }
}

export function Duration<T extends MediaItem>({duration}: Pick<T, 'duration'>) {
    return <time className="duration">{formatTime(duration)}</time>;
}

export function Thumbnail<T extends MediaItem>({thumbnails}: Pick<T, 'thumbnails'>) {
    const thumbnail = findBestThumbnail(thumbnails);

    return (
        <div className="thumbnail">
            <div
                className="thumbnail-img"
                style={{
                    backgroundImage: `url(${thumbnail.url})`,
                }}
            />
        </div>
    );
}
