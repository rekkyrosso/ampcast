import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import RadioList from 'components/MediaList/RadioList';
import useSource from 'hooks/useSource';
import PageHeader from './PageHeader';

export interface RadioBrowserProps {
    service: MediaService;
    source: MediaSource<MediaItem>;
}

export default function RadioBrowser({service, source}: RadioBrowserProps) {
    const pager = useSource(source);
    return (
        <>
            <PageHeader icon={service.icon}>{service.name}</PageHeader>
            <div className="panel">
                <RadioList title={source.title} pager={pager} reportingId={source.id} />
            </div>
        </>
    );
}
