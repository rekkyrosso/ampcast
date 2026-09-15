import React, {useMemo, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaSource from 'types/MediaSource';
import {getServiceFromSrc} from 'services/mediaServices';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import MediaItemList from 'components/MediaList/MediaItemList';
import MediaObjectBrowser from 'components/MediaObjectBrowser';
import useFirstValue from 'hooks/useFirstValue';
import {PagedItemsProps} from './PagedItems';

export default function MediaItems({source, ...props}: PagedItemsProps<MediaItem>) {
    const [[selectedItem], setSelectedItem] = useState<readonly MediaItem[]>([]);
    const item = useFirstValue(selectedItem);
    const [error, setError] = useState<unknown>();

    const itemList = (
        <MediaItemList
            {...props}
            title={source.title}
            source={source}
            level={1}
            onError={setError}
            onSelect={setSelectedItem}
        />
    );

    return (
        <div className="panel">
            {source.singular ? (
                <MediaObjectBrowser item={item} itemList={itemList} error={error}>
                    <BrowserItems source={source} item={item} />
                </MediaObjectBrowser>
            ) : (
                itemList
            )}
        </div>
    );
}

interface BrowserItemsProps {
    source: MediaSource<MediaItem>;
    item: MediaItem | undefined;
}

function BrowserItems({source, item}: BrowserItemsProps) {
    const pager = useMemo(() => {
        if (item) {
            const service = getServiceFromSrc(item);
            if (service?.createSongsPager) {
                const pager = service.createSongsPager(item);
                if (pager) {
                    return pager;
                }
            }
            return new SimpleMediaPager(async () => [item]);
        } else {
            return null;
        }
    }, [item]);

    return (
        <MediaItemList
            className="mixed-media-items"
            title={source.title}
            source={source}
            pager={pager}
            level={2}
        />
    );
}
