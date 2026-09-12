import React, {useMemo, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaSource from 'types/MediaSource';
import MediaType from 'types/MediaType';
import {getServiceFromSrc} from 'services/mediaServices';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import MediaItemList from 'components/MediaList/MediaItemList';
import MediaObjectBrowser from 'components/MediaObjectBrowser';
import useFirstValue from 'hooks/useFirstValue';
import {PagedItemsProps} from './PagedItems';

export default function MediaItems({source, ...props}: PagedItemsProps<MediaItem>) {
    const [[selectedItem], setSelectedItem] = useState<readonly MediaItem[]>([]);
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
                <MediaObjectBrowser item={selectedItem} itemList={itemList} error={error}>
                    <BrowserItems source={source} item={selectedItem} />
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
    const firstItem = useFirstValue(item);
    const pager = useMemo(() => {
        if (firstItem) {
            return new SimpleMediaPager(async () => {
                const items = [firstItem];
                if (firstItem.mediaType === MediaType.Audio && !firstItem.linearType) {
                    const service = getServiceFromSrc(firstItem);
                    if (service?.createSongRadio) {
                        const radio = service.createSongRadio(firstItem);
                        if (radio) {
                            items.push(radio);
                        }
                    }
                }
                return items;
            });
        } else {
            return null;
        }
    }, [firstItem]);

    return <MediaItemList title={source.title} source={source} pager={pager} level={2} />;
}
