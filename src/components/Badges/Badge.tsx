import React from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import {copyToClipboard} from 'utils';
import audioSettings from 'services/audio/audioSettings';
import CopyButton from 'components/Button/CopyButton';
import Icon from 'components/Icon';
import './Badge.scss';

export interface BadgeProps {
    children?: React.ReactNode;
    className?: string;
    title?: string;
}

export function Badge({className = '', title, children}: BadgeProps) {
    return (
        <span className={`badge ${className}`} title={title}>
            <span className="badge-text">{children}</span>
        </span>
    );
}

export interface BitRateBadgeProps {
    item: MediaItem;
}

export function BitRateBadge({item}: BitRateBadgeProps) {
    return item.bitRate ? (
        <Badge className="bit-rate" title="Bit rate">
            {item.bitRate}
        </Badge>
    ) : null;
}

export interface ExplicitBadgeProps {
    item: MediaItem | MediaAlbum;
}

export function ExplicitBadge({item}: ExplicitBadgeProps) {
    return item.explicit ? (
        <Badge className="explicit" title="Explicit">
            E
        </Badge>
    ) : null;
}

export interface ReplayGainBadgeProps {
    item: MediaItem;
}

export function ReplayGainBadge({item}: ReplayGainBadgeProps) {
    return audioSettings.replayGainMode && (item.albumGain ?? item.trackGain) != null ? (
        <Badge className="replay-gain" title="ReplayGain metadata">
            RG
        </Badge>
    ) : null;
}

export interface ShareLinkProps {
    item: MediaItem | MediaAlbum;
}

export function ShareLink({item}: ShareLinkProps) {
    return item.shareLink ? (
        <CopyButton
            className="badge share-link"
            title="Copy link to clipboard"
            onClick={() => copyToClipboard(item.shareLink)}
        >
            Share link
        </CopyButton>
    ) : null;
}

export interface ExternalLinkBadgeProps {
    item: MediaItem | MediaAlbum | MediaArtist;
}

export function LastFmBadge({item}: ExternalLinkBadgeProps) {
    if (/^(lastfm|listenbrainz|mixcloud|musicbrainz):/.test(item.src)) {
        return;
    }
    const title = encodeURIComponent(item.title);

    let path = '';
    switch (item.itemType) {
        case ItemType.Media: {
            const artist = encodeURIComponent(item.artists?.[0] || '');
            if (artist && item.title) {
                path = `${artist}/${encodeURIComponent(item.album || '') || '_'}/${title}`;
            }
            break;
        }

        case ItemType.Album: {
            if (item.artist && title) {
                path = `${encodeURIComponent(item.artist)}/${title}`;
            }
            break;
        }

        case ItemType.Artist:
            if (item.title) {
                path = title;
            }
            break;
    }
    if (path) {
        return (
            /* eslint-disable-next-line react/jsx-no-target-blank */
            <a
                className="badge external lastfm"
                href={`https://www.last.fm/music/${path.replaceAll('%20', '+')}`}
                title="View on last.fm"
                target="_blank"
                rel="noopener"
            >
                <Icon name="lastfm" />
            </a>
        );
    }
}

export function MusicBrainzBadge({item}: ExternalLinkBadgeProps) {
    if (/^(lastfm|listenbrainz|musicbrainz):/.test(item.src)) {
        return;
    }
    let path = '';
    switch (item.itemType) {
        case ItemType.Media:
            if (item.recording_mbid) {
                path = `recording/${item.recording_mbid}`;
            } else if (item.track_mbid) {
                path = `track/${item.track_mbid}`;
            }
            break;

        case ItemType.Album:
            if (item.release_mbid) {
                path = `release/${item.release_mbid}`;
            }
            break;

        case ItemType.Artist:
            if (item.artist_mbid) {
                path = `artist/${item.artist_mbid}`;
            }
            break;
    }
    if (path) {
        return (
            /* eslint-disable-next-line react/jsx-no-target-blank */
            <a
                className="badge external musicbrainz"
                href={`https://musicbrainz.org/${path}`}
                title="View on MusicBrainz"
                target="_blank"
                rel="noopener"
            >
                <Icon name="musicbrainz" />
            </a>
        );
    }
}
