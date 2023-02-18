import React, {useCallback, useEffect, useState} from 'react';
import ItemType from 'types/ItemType';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaService from 'types/MediaService';
import Pager from 'types/Pager';
import FolderItemList from 'components/MediaList/FolderItemList';
import {PagedBrowserProps} from './MediaBrowser';
import PageHeader from './PageHeader';

export interface FolderItemBrowserProps extends PagedBrowserProps<MediaFolderItem> {
    service: MediaService;
}

export default function FolderItemBrowser({
    service,
    source,
    className = '',
    ...props
}: FolderItemBrowserProps) {
    const [pager, setPager] = useState<Pager<MediaFolderItem> | null>(null);
    const [path, setPath] = useState('/');

    useEffect(() => {
        const pager = source.search();
        setPager(pager);
        setPath('/');
        return () => pager.disconnect();
    }, [source]);

    const handleDoubleClick = useCallback(async (item: MediaFolderItem) => {
        if (item.itemType === ItemType.Folder) {
            setPager(item.pager);
            setPath(item.path || '/');
        }
    }, []);

    const handleEnter = useCallback(async (items: readonly MediaFolderItem[]) => {
        if (items.length === 1) {
            const item = items[0];
            if (item?.itemType === ItemType.Folder) {
                setPager(item.pager);
                setPath(item.path || '/');
            }
        }
    }, []);

    return (
        <>
            <PageHeader icon={service.icon}>
                {service.name}: {path}
            </PageHeader>
            <div className={`panel folder-item-browser ${className}`}>
                <FolderItemList
                    {...props}
                    pager={pager}
                    keepAlive={true}
                    onEnter={handleEnter}
                    onDoubleClick={handleDoubleClick}
                />
            </div>
        </>
    );
}
