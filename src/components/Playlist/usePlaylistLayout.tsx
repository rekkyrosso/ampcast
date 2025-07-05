import React, {useCallback, useEffect, useMemo, useState} from 'react';
import LinearType from 'types/LinearType';
import LookupStatus from 'types/LookupStatus';
import PlaylistItem from 'types/PlaylistItem';
import {MAX_DURATION} from 'services/constants';
import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import {isPlayableSrc} from 'services/mediaServices';
import {ExplicitBadge, LivePlaybackBadge} from 'components/Badges';
import Icon, {IconName} from 'components/Icon';
import {ListViewLayout} from 'components/ListView';
import MediaButton from 'components/MediaControls/MediaButton';
import Time from 'components/Time';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePaused from 'hooks/usePaused';
import usePlaybackState from 'hooks/usePlaybackState';

const playlistLayout: ListViewLayout<PlaylistItem> = {
    view: 'details',
    showTitles: false,
    cols: [
        {title: '#', render: () => null, align: 'right', className: 'index'},
        {title: 'Source', render: RowIcon, align: 'center', className: 'source'},
        {title: 'Title', render: RowTitle, className: 'title'},
        {title: 'Time', render: Duration, align: 'right', className: 'duration'},
    ],
};

export default function usePlaylistLayout(size: number): ListViewLayout<PlaylistItem> {
    const item = useCurrentlyPlaying();
    const currentId = item?.id;
    const paused = usePaused();
    const sizeExponent = String(size).length;

    return useMemo(() => {
        return {
            ...playlistLayout,
            cols: playlistLayout.cols.map((col) => {
                if (col.className === 'index') {
                    return {
                        ...col,
                        render: (item: PlaylistItem, {rowIndex}) => {
                            const rowNumber = RowNumber(rowIndex, sizeExponent);
                            if (item.id === currentId) {
                                return (
                                    <>
                                        <Icon name={paused ? 'pause' : 'play'} />
                                        {rowNumber}
                                    </>
                                );
                            } else {
                                return rowNumber;
                            }
                        },
                    };
                } else if (col.className === 'duration') {
                    return {
                        ...col,
                        render: (item: PlaylistItem) => {
                            if (item.id === currentId && !paused && item.skippable) {
                                return <Skip />;
                            } else {
                                return Duration(item);
                            }
                        },
                    };
                } else {
                    return col;
                }
            }),
        };
    }, [sizeExponent, currentId, paused]);
}

function Skip() {
    const [disabled, setDisabled] = useState(true);
    const {currentTime, startedAt} = usePlaybackState();
    const playbackStarted = currentTime >= 1 && Date.now() - startedAt >= 1000;

    useEffect(() => {
        if (playbackStarted) {
            setDisabled(false);
        }
    }, [playbackStarted]);

    const skipNext = useCallback(async () => {
        setDisabled(true);
        await mediaPlayer.skipNext();
        setDisabled(false);
    }, []);

    const skipPrev = useCallback(async () => {
        setDisabled(true);
        await mediaPlayer.skipPrev();
        setDisabled(false);
    }, []);

    return (
        <div className="media-buttons">
            <MediaButton
                icon="play"
                aria-label="Skip to previous track"
                onClick={skipPrev}
                disabled={disabled}
            />
            <MediaButton
                icon="play"
                aria-label="Skip to next track"
                onClick={skipNext}
                disabled={disabled}
            />
        </div>
    );
}

function RowNumber(rowIndex: number, numberOfDigits = 0) {
    return (
        <span className="number text">{String(rowIndex + 1).padStart(numberOfDigits, '0')}</span>
    );
}

function RowIcon({src, lookupStatus, linearType}: PlaylistItem) {
    const [serviceId] = src.split(':');
    let iconName: IconName;

    switch (lookupStatus) {
        case LookupStatus.Looking:
            iconName = 'lookup-looking';
            break;

        case LookupStatus.NotFound:
            iconName = 'lookup-not-found';
            break;

        default:
            if (/^https?/.test(src) && linearType === LinearType.Station) {
                iconName = 'internet-radio';
            } else if (isPlayableSrc(src)) {
                iconName = serviceId as IconName;
            } else {
                iconName = 'lookup-pending';
            }
    }

    return (
        <Icon
            name={iconName}
            // YouTube is always playable.
            className={serviceId === 'youtube' ? '' : 'show-connectivity'}
        />
    );
}

function RowTitle(item: PlaylistItem) {
    const {title, artists} = item;
    return (
        <span className="row-title">
            <span className="row-title-text text">
                {artists?.length ? (
                    <>
                        <span className="artist-text">{artists.join('/')}</span>
                        <span role="separator">-</span>
                        <span className="title-text">{title}</span>
                    </>
                ) : (
                    <span className="title-text">{title}</span>
                )}
            </span>{' '}
            <LivePlaybackBadge item={item} />
            <ExplicitBadge item={item} />
        </span>
    );
}

function Duration({duration}: PlaylistItem) {
    return duration === MAX_DURATION ? (
        <span className="text">–:––</span>
    ) : (
        <Time className="text" time={duration} />
    );
}
