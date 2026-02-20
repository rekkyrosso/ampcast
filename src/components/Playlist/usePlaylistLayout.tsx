import React, {useMemo} from 'react';
import LinearType from 'types/LinearType';
import LookupStatus from 'types/LookupStatus';
import PlaylistItem from 'types/PlaylistItem';
import {hasPlayableSrc} from 'services/mediaServices';
import {ExplicitBadge, LivePlaybackBadge} from 'components/Badges';
import Icon, {IconName} from 'components/Icon';
import {ListViewLayout} from 'components/ListView';
import RadioButtons from 'components/MediaControls/RadioButtons';
import Time from 'components/Time';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePaused from 'hooks/usePaused';

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
                                return (
                                    <div className="radio-buttons">
                                        <RadioButtons />
                                    </div>
                                );
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

function RowNumber(rowIndex: number, numberOfDigits = 0) {
    return (
        <span className="number text">{String(rowIndex + 1).padStart(numberOfDigits, '0')}</span>
    );
}

function RowIcon(item: PlaylistItem) {
    const [serviceId] = item.src.split(':');
    let iconName: IconName;

    switch (item.lookupStatus) {
        case LookupStatus.Looking:
            iconName = 'lookup-looking';
            break;

        case LookupStatus.NotFound:
            iconName = 'lookup-not-found';
            break;

        default:
            if (/^https?/.test(item.src) && item.linearType === LinearType.Station) {
                iconName = 'internet-radio';
            } else if (hasPlayableSrc(item)) {
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

function Duration(item: PlaylistItem) {
    return <Time className="text" time={item.duration} />;
}
