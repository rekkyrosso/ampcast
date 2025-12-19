import React from 'react';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFolder from 'types/MediaFolder';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import {getService} from 'services/mediaServices';
import DefaultActions, {ActionsProps} from 'components/Actions';
import Badges from 'components/Badges';
import CoverArt, {CoverArtProps} from 'components/CoverArt';
import ExternalLink from 'components/ExternalLink';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import TextBox from 'components/TextBox';
import Time from 'components/Time';
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

        case ItemType.Folder:
            return <FolderInfo item={item} />;
    }
}

function MediaItemInfo({item}: MediaInfoProps<MediaItem>) {
    return (
        <article className="media-info">
            <div className="media-info-main">
                <Thumbnail item={item} extendedSearch />
                <Title title={item.title} />
                {item.linearType === LinearType.Station ? null : (
                    <Duration duration={item.duration} />
                )}
                <Artist artist={item.artists?.join(', ')} />
                <AlbumAndYear album={item.album} year={item.year} />
                <Track album={item.album} disc={item.disc} track={item.track} />
                {item.linearType ? <StationName stationName={item.stationName} /> : null}
                <Owner owner={item.owner} src={item.src} />
                <Genre genres={item.genres} />
                <div className="media-info-icon-bar">
                    <Badges item={item} />
                    <Actions item={item} />
                </div>
            </div>
            <Description description={item.description} />
            <ExternalView
                url={item.externalUrl}
                src={item.src}
                isExternalMedia={item.isExternalMedia}
            />
        </article>
    );
}

function AlbumInfo({item: album}: MediaInfoProps<MediaAlbum>) {
    return (
        <article className="media-info">
            <div className="media-info-main">
                <Thumbnail item={album} extendedSearch />
                <Title title={album.title} />
                <TrackCount trackCount={album.trackCount} />
                <Artist artist={album.artist} />
                <Year year={album.year} />
                <Genre genres={album.genres} />
                <div className="media-info-icon-bar">
                    <Badges item={album} />
                    <Actions item={album} />
                </div>
            </div>
            <Description description={album.description} />
            <ExternalView url={album.externalUrl} src={album.src} />
        </article>
    );
}

function ArtistInfo({item: artist}: MediaInfoProps<MediaArtist>) {
    return (
        <article className="media-info">
            <div className="media-info-main">
                <Thumbnail item={artist} />
                <Title title={artist.title} />
                <Genre genres={artist.genres} />
                <Country country={artist.country} />
                <div className="media-info-icon-bar">
                    <Badges item={artist} />
                    <Actions item={artist} />
                </div>
            </div>
            <Description description={artist.description} />
            <ExternalView url={artist.externalUrl} src={artist.src} />
        </article>
    );
}

function PlaylistInfo({item: playlist}: MediaInfoProps<MediaPlaylist>) {
    return (
        <article className="media-info">
            <div className="media-info-main">
                <Thumbnail item={playlist} />
                <Title title={playlist.title} />
                <TrackCount trackCount={playlist.trackCount} />
                <Owner owner={playlist.owner} src={playlist.src} />
                <Genre genres={playlist.genres} />
                <div className="media-info-icon-bar">
                    <Actions item={playlist} />
                </div>
            </div>
            <Description description={playlist.description} />
            <ExternalView url={playlist.externalUrl} src={playlist.src} />
        </article>
    );
}

function FolderInfo({item: folder}: MediaInfoProps<MediaFolder>) {
    return (
        <article className="media-info">
            <div className="media-info-main">
                <Thumbnail item={folder} />
                <Title title={folder.title} />
            </div>
        </article>
    );
}

function Title<T extends MediaObject>({title}: Pick<T, 'title'>) {
    return <h3 className="title">{title || '(no title)'}</h3>;
}

function Description<T extends MediaPlaylist>({description}: Pick<T, 'description'>) {
    return description ? (
        <TextBox className="description">
            {description.split(/\n+/).map((text, index) => (
                <p key={index}>{text}</p>
            ))}
        </TextBox>
    ) : null;
}

function Duration<T extends MediaItem>({duration}: Pick<T, 'duration'>) {
    return (
        <p className="duration">
            <Time className="text" time={duration || 0} />
        </p>
    );
}

function TrackCount<T extends MediaAlbum | MediaPlaylist>({trackCount}: Pick<T, 'trackCount'>) {
    if (trackCount == null) {
        return null;
    }
    const value = Number(trackCount);
    return isNaN(value) ? null : <p className="track-count">{value.toLocaleString()}</p>;
}

function Artist<T extends MediaAlbum>({artist}: Pick<T, 'artist'>) {
    return artist ? (
        <h4 className="artist">
            <span className="text-label">By:</span> {artist}
        </h4>
    ) : null;
}

export function Owner<T extends MediaItem | MediaPlaylist>({src, owner}: Pick<T, 'src' | 'owner'>) {
    if (!owner || !owner.name) {
        return null;
    }

    const [serviceId] = src.split(':');
    const label = serviceId === 'youtube' ? 'Channel' : 'Curator';

    return (
        <p className="owner">
            {label}:{' '}
            {owner.url ? <ExternalLink href={owner.url}>{owner.name}</ExternalLink> : owner.name}
        </p>
    );
}

function StationName<T extends MediaItem>({stationName}: Pick<T, 'stationName'>) {
    return stationName ? (
        <p className="station-name">
            <span className="text-label">Station:</span> {stationName}
        </p>
    ) : null;
}

function ExternalView({
    src,
    url = '',
    isExternalMedia,
}: {
    src: string;
    url?: string | undefined;
    isExternalMedia?: boolean | undefined;
}) {
    if (isExternalMedia) {
        return url ? (
            <p className="external-view">
                <ExternalLink href={url} />
            </p>
        ) : null;
    }

    const [serviceId] = src.split(':');
    let serviceName = serviceId;

    switch (serviceId) {
        case 'musicbrainz':
            serviceName = 'MusicBrainz';
            break;

        case 'listenbrainz':
            if (/musicbrainz/.test(url)) {
                serviceName = 'MusicBrainz';
            } else {
                serviceName = 'ListenBrainz';
            }
            break;

        case 'blob':
        case 'file':
            serviceName = 'local file system';
            break;

        case 'http':
        case 'https':
            if (url) {
                return (
                    <p className="external-view">
                        <ExternalLink href={url} />
                    </p>
                );
            } else {
                serviceName = 'external source';
            }
            break;

        case 'internet-radio':
            return null;

        default:
            serviceName = getService(serviceId)?.name || serviceName;
    }

    return (
        <p className="external-view">
            {url ? (
                <ExternalLink icon={serviceId as MediaServiceId} href={url}>
                    View on {serviceName}
                </ExternalLink>
            ) : (
                <MediaSourceLabel
                    icon={serviceId as MediaServiceId}
                    text={`Provided by ${serviceName}`}
                />
            )}
        </p>
    );
}

function AlbumAndYear<T extends MediaItem>({album, year}: Pick<T, 'album' | 'year'>) {
    return (
        <>
            {album ? (
                <h4 className="album">
                    <span className="text-label">From:</span> {album}
                </h4>
            ) : null}
            {year ? (
                <p>
                    <span className="text-label">Year:</span> {year}
                </p>
            ) : null}
        </>
    );
}

function Track<T extends MediaItem>({album, disc = 1, track}: Pick<T, 'album' | 'disc' | 'track'>) {
    if (album && track) {
        return (
            <p className="track">
                Track: {track}
                {disc > 1 ? ` (Disc ${disc})` : ''}
            </p>
        );
    }
    return null;
}

function Year<T extends MediaItem>({year}: Pick<T, 'year'>) {
    if (year) {
        return <p className="year">Year: {year}</p>;
    } else {
        return null;
    }
}

function Genre<T extends MediaItem>({genres}: Pick<T, 'genres'>) {
    if (genres?.length) {
        if (genres.length === 1) {
            genres = genres[0].split(/\s*[,;/]\s*/);
        }
        return (
            <p className="genre">
                <span className="text-label">Genre:</span> {genres.join(', ')}
            </p>
        );
    } else {
        return null;
    }
}

function Country<T extends MediaArtist>({country}: Pick<T, 'country'>) {
    if (country) {
        return <p className="country">Country: {country}</p>;
    } else {
        return null;
    }
}

export function Thumbnail({className = '', ...props}: CoverArtProps) {
    return (
        <div className={`thumbnail ${className}`}>
            <CoverArt size={480} {...props} />
        </div>
    );
}

function Actions({item}: ActionsProps) {
    return <DefaultActions item={item} inInfoView />;
}
