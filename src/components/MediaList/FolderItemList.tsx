import React, {useCallback, useState} from 'react';
import ItemType from 'types/ItemType';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaList, {MediaListProps} from './MediaList';
import {folderItemsLayout} from './layouts';

export default function FolderItemList({
    className = '',
    defaultLayout = folderItemsLayout,
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
            defaultLayout={defaultLayout}
            multiple={canMultiSelect}
            draggable={canDrag}
            onSelect={handleSelect}
        />
    );
}
