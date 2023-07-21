import React, {useEffect, useReducer} from 'react';
import {from, interval} from 'rxjs';
import MediaItem from 'types/MediaItem';
import MediaSourceLayout from 'types/MediaSourceLayout';
import {isScrobbler} from 'services/mediaServices';
import PageHeader from './PageHeader';
import PagedItems, {PagedItemsProps} from './PagedItems';

export interface RecentlyPlayedBrowserProps extends PagedItemsProps<MediaItem> {
    total?: number;
}

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
};

export default function RecentlyPlayedBrowser({
    service,
    source,
    total,
    ...props
}: RecentlyPlayedBrowserProps) {
    const [, forceUpdate] = useReducer((i) => i++, 0);

    useEffect(() => {
        // Make sure the "last played" fields are updated.
        const subscription = from(interval(60_000)).subscribe(forceUpdate);
        return () => subscription.unsubscribe();
    }, []);

    return (
        <>
            <PageHeader icon={service.icon}>
                {total === undefined ? (
                    service.name
                ) : (
                    <>
                        {service.name}: {total.toLocaleString()}{' '}
                        {isScrobbler(service) ? 'scrobbles' : 'plays'}
                    </>
                )}
            </PageHeader>
            <PagedItems
                {...props}
                service={service}
                source={source}
                layout={source.layout || defaultLayout}
            />
        </>
    );
}
