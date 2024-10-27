import React from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import audioSettings from 'services/audio/audioSettings';
import './Badge.scss';

export interface BadgeProps {
    children?: React.ReactNode;
    className?: string;
    title?: string;
}

export function Badge({className = '', title, children}: BadgeProps) {
    return (
        <span className={`badge ${className}`} role="img" title={title}>
            <span className="text">{children}</span>
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
