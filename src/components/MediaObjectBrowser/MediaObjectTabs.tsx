import React, {useCallback, useEffect, useMemo, useState} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import ErrorBox from 'components/Errors/ErrorBox';
import MediaDetails from 'components/MediaInfo/MediaDetails';
import MediaInfo from 'components/MediaInfo';
import Scrollable from 'components/Scrollable';
import TabList, {TabItem} from 'components/TabList';
import useFirstValue from 'hooks/useFirstValue';
import RelatedItems from './RelatedItems';
import RelatedPlaylists from './RelatedPlaylists';

export interface MediaObjectTabsProps<T extends MediaObject> {
    service: MediaService;
    source: MediaSource<T>;
    item: T | undefined;
    error?: unknown;
    children?: React.ReactNode;
    onSourceChange?: (source: MediaSource<any> | undefined) => void;
}

export default function MediaObjectTabs<T extends MediaObject>({
    service,
    source,
    item,
    error,
    children,
    onSourceChange,
}: MediaObjectTabsProps<T>) {
    const [currentSource, setCurrentSource] = useState<MediaSource<any> | undefined>(source);
    const initialItem = useFirstValue(item); // Prevent re-renders if the object is updated.

    useEffect(() => {
        onSourceChange?.(currentSource);
    }, [currentSource, onSourceChange]);

    const relatedPlaylists = useMemo(() => {
        return initialItem ? service.createRelatedPlaylistsSource?.(initialItem) : undefined;
    }, [service, initialItem]);

    const relatedItems = useMemo(() => {
        const pager = initialItem ? service.createRelatedItemsPager?.(initialItem) : undefined;
        return pager
            ? {
                  ...source,
                  singular: false,
                  id: `${source.id}/related`,
                  sourceId: `${source.sourceId || source.id}/related`,
                  search() {
                      return pager;
                  },
              }
            : undefined;
    }, [service, source, initialItem]);

    const tabs: TabItem[] = useMemo(() => {
        const tabs = [
            {
                tab: 'Media',
                panel: error ? (
                    <ErrorBox error={error} reportedBy="MediaObjectBrowser" />
                ) : (
                    children
                ),
                id: 'media',
            },
        ];
        if (initialItem) {
            if (relatedPlaylists) {
                tabs.push({
                    tab: 'Playlists',
                    panel: (
                        <RelatedPlaylists
                            service={service}
                            source={relatedPlaylists}
                            emptyMessage={
                                initialItem.itemType === ItemType.Media
                                    ? 'Not featured on any playlists.'
                                    : 'No playlists found.'
                            }
                        />
                    ),
                    id: 'playlists',
                });
            }
            if (relatedItems) {
                tabs.push({
                    tab: 'Related',
                    panel: <RelatedItems service={service} source={relatedItems} />,
                    id: 'related',
                });
            }
            tabs.push(
                {
                    tab: 'Info',
                    panel: (
                        <Scrollable>
                            <MediaInfo item={initialItem} />
                        </Scrollable>
                    ),
                    id: 'info',
                },
                {
                    tab: 'Details',
                    panel: <MediaDetails item={initialItem} />,
                    id: 'details',
                }
            );
        }
        return tabs;
    }, [service, initialItem, children, error, relatedPlaylists, relatedItems]);

    const handleTabSelect = useCallback(
        (tabId?: string) => {
            switch (tabId) {
                case 'media':
                    setCurrentSource(source);
                    break;

                case 'playlists':
                    setCurrentSource(relatedPlaylists);
                    break;

                case 'related':
                    setCurrentSource(relatedItems);
                    break;

                default:
                    setCurrentSource(undefined);
            }
        },
        [source, relatedPlaylists, relatedItems]
    );

    return (
        <TabList
            className="media-object-tabs"
            items={tabs}
            label={error ? 'Error' : item?.title || ''}
            onTabSelect={handleTabSelect}
        />
    );
}
