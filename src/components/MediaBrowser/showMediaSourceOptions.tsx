import React from 'react';
import MediaSource from 'types/MediaSource';
import {getSourceSorting, setSourceSorting} from 'services/mediaServices/servicesSettings';
import PopupMenu, {
    PopupMenuItemCheckbox,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';

export default async function showMediaSourceOptions(
    source: MediaSource<any>,
    x: number,
    y: number
): Promise<void> {
    const setting = getSourceSorting(source);
    const option = await showPopupMenu(
        (props: PopupMenuProps) => <MediaSourceOptions {...props} source={source} />,
        x,
        y,
        'right'
    );

    switch (option) {
        case '1':
        case '-1':
            setSourceSorting(source, setting.sortBy, Number(option) as 1);
            break;

        default:
            if (option) {
                setSourceSorting(source, option, setting.sortOrder);
            }
            break;
    }
}

interface MediaSourceOptionsProps extends PopupMenuProps {
    source: MediaSource<any>;
}

function MediaSourceOptions({source, ...props}: MediaSourceOptionsProps) {
    const options = source.sortOptions || {};
    const sorting = getSourceSorting(source);
    return (
        <PopupMenu {...props}>
            {Object.keys(options).map((key) => (
                <PopupMenuItemCheckbox
                    label={options[key]}
                    value={key}
                    checked={sorting.sortBy === key}
                    key={key}
                />
            ))}
            <PopupMenuSeparator />
            <PopupMenuItemCheckbox
                label="Sort Ascending"
                value="1"
                checked={sorting.sortOrder === 1}
                key="1"
            />
            <PopupMenuItemCheckbox
                label="Sort Descending"
                value="-1"
                checked={sorting.sortOrder === -1}
                key="-1"
            />
        </PopupMenu>
    );
}
