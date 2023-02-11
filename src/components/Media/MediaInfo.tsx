import React from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFolder from 'types/MediaFolder';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {getService} from 'services/mediaServices';
import Actions from 'components/Actions';
import CoverArt, {CoverArtProps} from 'components/CoverArt';
import ExternalLink from 'components/ExternalLink';
import Icon, {MediaSourceIconName} from 'components/Icon';
import {formatTime} from 'utils';
import useCurrentItem from './useCurrentItem';
import './MediaInfo.scss';

export interface MediaInfoProps<T extends MediaObject> {
    item: T;
    debug?: boolean;
}

export default function MediaInfo<T extends MediaObject>(props: MediaInfoProps<T>) {
    const item = useCurrentItem(props.item);

    if (props.debug) {
        return <Debug item={item} />;
    } else {
        switch (item.itemType) {
            case ItemType.Media:
                return <MediaItemInfo item={item} />;

            case ItemType.Artist:
                return <ArtistInfo item={item} />;

            case ItemType.Album:
                return <AlbumInfo item={item} />;

            case ItemType.Playlist:
                return <PlaylistInfo item={item} />;

            case ItemType.Folder:
                return <FolderInfo item={item} />;
        }
    }
}

function MediaItemInfo({item}: MediaInfoProps<MediaItem>) {
    return (
        <article className="media-info media-item-info">
            <div className="media-info-main">
                <Thumbnail item={item} />
                <Title title={item.title} />
                <Artist artist={item.artists?.join(', ')} />
                <AlbumAndYear album={item.album} year={item.year} />
                <Track album={item.album} track={item.track} />
                <Owner owner={item.owner} src={item.src} />
                <Actions item={item} />
            </div>
            <Blurb description={item.description} />
            <ExternalView url={item.externalUrl} src={item.src} />
        </article>
    );
}

function AlbumInfo({item: album}: MediaInfoProps<MediaAlbum>) {
    return (
        <article className="media-info album-info">
            <div className="media-info-main">
                <Thumbnail item={album} />
                <Title title={album.title} />
                <Artist artist={album.artist} />
                <Year year={album.year} />
                <Actions item={album} />
            </div>
            <Blurb description={album.description} />
            <ExternalView url={album.externalUrl} src={album.src} />
        </article>
    );
}

function ArtistInfo({item: artist}: MediaInfoProps<MediaArtist>) {
    return (
        <article className="media-info artist-info">
            <div className="media-info-main">
                <Thumbnail item={artist} />
                <Title title={artist.title} />
                <Genre genres={artist.genres} />
                <Country country={artist.country} />
                <Actions item={artist} />
            </div>
            <Blurb description={artist.description} />
            <ExternalView url={artist.externalUrl} src={artist.src} />
        </article>
    );
}

function PlaylistInfo({item: playlist}: MediaInfoProps<MediaPlaylist>) {
    return (
        <article className="media-info playlist-info">
            <div className="media-info-main">
                <Thumbnail item={playlist} />
                <Title title={playlist.title} />
                <Owner owner={playlist.owner} src={playlist.src} />
                <Genre genres={playlist.genres} />
                <Actions item={playlist} />
            </div>
            <Blurb description={playlist.description} />
            <ExternalView url={playlist.externalUrl} src={playlist.src} />
        </article>
    );
}

function FolderInfo({item: folder}: MediaInfoProps<MediaFolder>) {
    return (
        <article className="media-info folder-info">
            <div className="media-info-main">
                <Thumbnail item={folder} />
                <Title title={folder.title} />
            </div>
        </article>
    );
}

export function Title<T extends MediaObject>({title}: Pick<T, 'title'>) {
    return <h3 className="title">{title || '(no title)'}</h3>;
}

export function Blurb<T extends MediaPlaylist>({description}: Pick<T, 'description'>) {
    return description ? (
        <div className="blurb text-box">
            <p>{description}</p>
        </div>
    ) : null;
}

export function Artist<T extends MediaAlbum>({artist}: Pick<T, 'artist'>) {
    return artist ? <h4 className="artist">By: {artist}</h4> : null;
}

export function Owner<T extends MediaObject>({src, owner}: Pick<T, 'src' | 'owner'>) {
    if (!owner || !owner.name) {
        return null;
    }

    const [service] = src.split(':');
    const label = service === 'youtube' ? 'Channel' : 'Curator';

    return (
        <p className="owner">
            {label}:{' '}
            {owner.url ? <ExternalLink href={owner.url}>{owner.name}</ExternalLink> : owner.name}
        </p>
    );
}

export function ExternalView({src, url = ''}: {src: string; url: string | undefined}) {
    let [serviceId] = src.split(':');
    let serviceName = serviceId;

    switch (serviceId) {
        case 'musicbrainz':
            serviceName = 'MusicBrainz';
            break;

        case 'listenbrainz':
            if (/musicbrainz/.test(url)) {
                serviceName = 'MusicBrainz';
                serviceId = 'musicbrainz';
            } else {
                serviceName = 'ListenBrainz';
            }
            break;

        default: {
            const service = getService(serviceId);
            if (service) {
                serviceName = service.name;
            }
        }
    }

    return (
        <p className="external-view">
            <Icon name={serviceId as MediaSourceIconName} />
            {url ? (
                <ExternalLink href={url}>View on {serviceName}</ExternalLink>
            ) : (
                <span className="external-provider">Provided by {serviceName}</span>
            )}
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

export function Track<T extends MediaItem>({
    album,
    disc,
    track,
}: Pick<T, 'album' | 'disc' | 'track'>) {
    if (album && track) {
        return (
            <>
                {disc && <p className="track disc">Disc: {disc}</p>}
                <p className="track">Track: {track}</p>
            </>
        );
    }
    return null;
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

export function Genre<T extends MediaItem>({genres}: Pick<T, 'genres'>) {
    if (genres) {
        return <p className="genre">Genre: {genres.join(', ')}</p>;
    } else {
        return null;
    }
}

export function Country<T extends MediaArtist>({country}: Pick<T, 'country'>) {
    if (country) {
        return <p className="country">Country: {country}</p>;
    } else {
        return null;
    }
}

export function Thumbnail(props: CoverArtProps) {
    return (
        <div className="thumbnail">
            <CoverArt {...props} />
        </div>
    );
}

function Debug(props: MediaInfoProps<MediaObject>) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {pager, ...item} = props.item as MediaAlbum;
    return (
        <article className="media-info debug">
            <pre>{JSON.stringify(item, undefined, 2)}</pre>
            <ExternalView url={item.externalUrl} src={item.src} />
        </article>
    );
}
