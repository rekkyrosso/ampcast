import React, {useMemo} from 'react';
import PlaylistItem from 'types/PlaylistItem';
import playlistSettings from 'services/playlist/playlistSettings';
import {ListViewLayout} from 'components/ListView';
import {Duration} from 'components/MediaList/useMediaListLayout';
import Icon, {MediaSourceIconName} from 'components/Icon';
import useObservable from 'hooks/useObservable';

const playlistLayout: ListViewLayout<PlaylistItem> = {
    view: 'details',
    showTitles: false,
    cols: [
        {title: '#', render: () => null, align: 'right', className: 'track'},
        {title: 'Source', render: RowIcon, align: 'center', className: 'source'},
        {title: 'Title', render: RowTitle, className: 'title'},
        {title: 'Time', render: Duration, align: 'right', className: 'duration'},
    ],
};

export default function usePlaylistLayout(size: number): ListViewLayout<PlaylistItem> {
    const sizeExponent = String(size).length;
    const {zeroPadLineNumbers, showLineNumbers, showSourceIcons} = useObservable(
        playlistSettings.observe,
        playlistSettings.get()
    );

    return useMemo(() => {
        return {
            ...playlistLayout,
            cols: playlistLayout.cols
                .filter((col) => {
                    switch (col.className) {
                        case 'track':
                            return showLineNumbers;

                        case 'source':
                            return showSourceIcons;

                        default:
                            return true;
                    }
                })
                .map((col) => {
                    if (col.className === 'track') {
                        return {
                            ...col,
                            render: (_, rowIndex) => {
                                return RowNumber(rowIndex, zeroPadLineNumbers ? sizeExponent : 0);
                            },
                        };
                    } else {
                        return col;
                    }
                }),
        };
    }, [zeroPadLineNumbers, showLineNumbers, showSourceIcons, sizeExponent]);
}

function RowNumber(rowIndex: number, numberOfDigits = 0) {
    return String(rowIndex + 1).padStart(numberOfDigits, '0');
}

function RowIcon({src}: PlaylistItem) {
    const [service] = src.split(':');
    return (
        <Icon
            name={service as MediaSourceIconName}
            // YouTube is always playable.
            className={service === 'youtube' ? '' : 'show-connectivity'}
        />
    );
}

function RowTitle({title, artist}: PlaylistItem) {
    if (artist) {
        return (
            <>
                <span className="artist-text">{artist}</span>
                <span role="separator">-</span>
                <span className="title-text">{title}</span>
            </>
        );
    } else {
        return <span className="title-text">{title}</span>;
    }
}
