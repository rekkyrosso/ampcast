import React from 'react';
import MediaItem from 'types/MediaItem';
import {recentlyPlayedTracksLayout} from 'components/MediaList/layouts';
import PageHeader from './PageHeader';
import PagedItems, {PagedItemsProps} from './PagedItems';

export interface ScrobblesBrowserProps extends PagedItemsProps<MediaItem> {
    title?: string;
}

export default function ScrobblesBrowser({
    service,
    source,
    title = source.title,
    ...props
}: ScrobblesBrowserProps) {
    return (
        <>
            <PageHeader icon={service.icon} source={source}>
                {service.name}: {title}
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
