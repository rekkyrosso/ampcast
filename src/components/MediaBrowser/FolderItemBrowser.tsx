import React, {useCallback, useEffect, useState} from 'react';
import ItemType from 'types/ItemType';
import MediaFolderItem from 'types/MediaFolderItem';
import Pager from 'types/Pager';
import FolderItemList from 'components/MediaList/FolderItemList';
import {PagedBrowserProps} from './MediaBrowser';

export default function FolderItemBrowser({
    source,
    className = '',
    ...props
}: PagedBrowserProps<MediaFolderItem>) {
    const [pager, setPager] = useState<Pager<MediaFolderItem> | null>(null);

    useEffect(() => {
        const pager = source.search();
        setPager(pager);
        return () => pager.disconnect();
    }, [source]);

    const handleDoubleClick = useCallback(async (item: MediaFolderItem) => {
        if (item.itemType === ItemType.Folder) {
            setPager(item.pager);
        }
    }, []);

    const handleEnter = useCallback(async (items: readonly MediaFolderItem[]) => {
        if (items.length === 1) {
            const item = items[0];
            if (item?.itemType === ItemType.Folder) {
                setPager(item.pager);
            }
        }
    }, []);

    return (
        <div className={`panel folder-item-browser ${className}`}>
            <FolderItemList
                {...props}
                pager={pager}
                keepAlive={true}
                onEnter={handleEnter}
                onDoubleClick={handleDoubleClick}
            />
        </div>
    );
}
