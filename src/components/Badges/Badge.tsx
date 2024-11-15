import React from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import {copyToClipboard} from 'utils';
import audioSettings from 'services/audio/audioSettings';
import CopyButton from 'components/Button/CopyButton';
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
