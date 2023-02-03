import React, {useCallback, useMemo, useState} from 'react';
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
    multiSelect = true,
    draggable = true,
    onSelect,
    ...props
}: MediaListProps<MediaFolderItem>) {
    const [selectedItems, setSelectedItems] = useState<readonly MediaFolderItem[]>([]);

    const canMultiSelect = useMemo(() => {
        return multiSelect && selectedItems.every((item) => item.itemType === ItemType.Media);
    }, [multiSelect, selectedItems]);

    const canDrag = useMemo(() => {
        return draggable && selectedItems.every((item) => item.itemType === ItemType.Media);
    }, [draggable, selectedItems]);

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
            multiSelect={canMultiSelect}
            draggable={canDrag}
            onSelect={handleSelect}
        />
    );
}
