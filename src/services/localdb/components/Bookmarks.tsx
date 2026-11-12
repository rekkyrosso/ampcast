import React, {useCallback, useRef, useState} from 'react';
import Bookmark from 'types/Bookmark';
import {MediaComponent} from 'types/MediaSource';
import ListView from 'components/ListView';
import PageHeader from 'components/MediaBrowser/PageHeader';
import MediaListStatusBar from 'components/MediaList/MediaListStatusBar';
import useObservable from 'hooks/useObservable';
import {observeBookmarks, removeBookmarks} from '../bookmarks';
import bookmarksLayout from './bookmarksLayout';
import showBookmarksMenu from './showBookmarksMenu';
import './Bookmarks.scss';

export default function Bookmarks({
    service,
    source,
}: React.ComponentProps<MediaComponent['Component']>) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const bookmarks = useObservable(observeBookmarks, []);
    const [selectedItems, setSelectedItems] = useState<readonly Bookmark[]>([]);

    const handleSelect = useCallback((items: readonly Bookmark[]) => {
        setSelectedItems(items);
    }, []);

    const handleContextMenu = useCallback(
        async (bookmarks: readonly Bookmark[], x: number, y: number, button: number) => {
            if (bookmarks.length === 0) {
                return;
            }
            const action = await showBookmarksMenu(
                containerRef.current!,
                x,
                y,
                button === -1 ? 'right' : 'left'
            );
            switch (action) {
                case 'delete':
                    removeBookmarks(bookmarks);
                    break;
            }
        },
        []
    );

    return (
        <div className="bookmarks" ref={containerRef}>
            <PageHeader icon={service.icon}>
                {service.name}: {source.title}
            </PageHeader>
            <ListView<Bookmark>
                title="Bookmarks"
                className="media-list"
                layout={bookmarksLayout}
                items={bookmarks}
                itemKey="bookmarkedAt"
                droppable={true}
                multiple={true}
                onContextMenu={handleContextMenu}
                onDelete={removeBookmarks}
                onSelect={handleSelect}
            />
            <MediaListStatusBar
                items={bookmarks}
                size={bookmarks.length}
                selectedCount={selectedItems.length}
            />
        </div>
    );
}
