import React, {useMemo} from 'react';
import PlaylistItem from 'types/PlaylistItem';
import LookupStatus from 'types/LookupStatus';
import {isPlayableSrc} from 'services/mediaServices';
import {ListViewLayout} from 'components/ListView';
import Icon, {IconName} from 'components/Icon';
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
                        render: (item: PlaylistItem, rowIndex) => {
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
                } else {
                    return col;
                }
            }),
        };
    }, [sizeExponent, currentId, paused]);
}

function RowNumber(rowIndex: number, numberOfDigits = 0) {
    return <span className="number">{String(rowIndex + 1).padStart(numberOfDigits, '0')}</span>;
}

function RowIcon({src, lookupStatus}: PlaylistItem) {
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
            if (isPlayableSrc(src)) {
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

function RowTitle({title, artists}: PlaylistItem) {
    if (artists?.length) {
        return (
            <>
                <span className="artist-text">{artists.join('/')}</span>
                <span role="separator">-</span>
                <span className="title-text">{title}</span>
            </>
        );
    } else {
        return <span className="title-text">{title}</span>;
    }
}

function Duration({duration}: PlaylistItem) {
    return <Time className="text" time={duration} />;
}
