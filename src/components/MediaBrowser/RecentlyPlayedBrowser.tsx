import React from 'react';
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
    return (
        <>
            <PageHeader icon={service.icon} menuButtonSource={source}>
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
