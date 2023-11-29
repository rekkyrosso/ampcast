import React, {useCallback, useState} from 'react';
import ItemType from 'types/ItemType';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaList, {MediaListProps} from './MediaList';

const defaultLayout: MediaSourceLayout<MediaFolderItem> = {
    view: 'card minimal',
    fields: ['FileIcon', 'FileName'],
};

export default function FolderItemList({
    className = '',
    layout = defaultLayout,
    multiple = true,
    draggable = true,
    onSelect,
    ...props
}: MediaListProps<MediaFolderItem>) {
    const [selectedItems, setSelectedItems] = useState<readonly MediaFolderItem[]>([]);
    const isOnlyMediaSelected = selectedItems.every((item) => item.itemType === ItemType.Media);
    const canMultiSelect = multiple && isOnlyMediaSelected;
    const canDrag = draggable && isOnlyMediaSelected;

    const handleSelect = useCallback(
        (items: readonly MediaFolderItem[]) => {
            setSelectedItems(items);
            onSelect?.(items);
        },
        [onSelect]
    );

    return (
        <MediaList
            {...props}
            className={`folder-items ${className}`}
            layout={layout}
            multiple={canMultiSelect}
            draggable={canDrag}
            onSelect={handleSelect}
        />
    );
}
