import React, {useEffect, useReducer} from 'react';
import {interval} from 'rxjs';
import MediaItem from 'types/MediaItem';
import {isScrobbler} from 'services/mediaServices';
import {recentlyPlayedTracksLayout} from 'components/MediaList/layouts';
import PageHeader from './PageHeader';
import PagedItems, {PagedItemsProps} from './PagedItems';

export interface RecentlyPlayedBrowserProps extends PagedItemsProps<MediaItem> {
    total?: number;
}

export default function RecentlyPlayedBrowser({
    service,
    source,
    total,
    ...props
}: RecentlyPlayedBrowserProps) {
    const [, forceUpdate] = useReducer((i) => i + 1, 0);

    useEffect(() => {
        // Make sure the "last played" fields are updated.
        const subscription = interval(60_000).subscribe(forceUpdate);
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
                defaultLayout={recentlyPlayedTracksLayout}
            />
        </>
    );
}
