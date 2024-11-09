import React, {useEffect, useState} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource, {AnyMediaSource, MediaMultiSource} from 'types/MediaSource';
import actionsStore from 'services/actions/actionsStore';
import SearchBar from 'components/SearchBar';
import useSearch from 'hooks/useSearch';
import {MediaBrowserProps} from './MediaBrowser';
import MediaSourceSelector from './MediaSourceSelector';
import PageHeader from './PageHeader';
import PagedItems from './PagedItems';

export default function DefaultBrowser({service, source}: MediaBrowserProps) {
    const sources = isMediaMultiSource(source) ? source.sources : [source];
    const [selectedSource, setSelectedSource] = useState<MediaSource<MediaObject>>(sources[0]);
    const [query, setQuery] = useState('');
    const pager = useSearch(selectedSource, query);
    const searchable = !!source.searchable;
    const showPagerHeader = !searchable && !selectedSource.isPin;

    useEffect(() => {
        if (selectedSource?.lockActionsStore) {
            actionsStore.lock(service.id, selectedSource.itemType);
        } else {
            actionsStore.unlock();
        }
    }, [service, selectedSource]);

    useEffect(() => {
        return () => actionsStore.unlock(); // Teardown
    }, [selectedSource]);

    return (
        <>
            {showPagerHeader ? (
                <PageHeader icon={service.icon}>
                    {service.name}: {source.title}
                </PageHeader>
            ) : null}
            {searchable ? (
                <SearchBar
                    name={`search-${service.id}`}
                    icon={service.icon}
                    placeholder={`Search ${service.name}`}
                    onSubmit={setQuery}
                />
            ) : null}
            {sources.length > 1 ? (
                <MediaSourceSelector sources={sources} onSourceChange={setSelectedSource} />
            ) : null}
            <PagedItems
                service={service}
                source={selectedSource}
                pager={pager}
                layout={selectedSource.layout}
                loadingText={query ? 'Searching' : undefined}
            />
        </>
    );
}

function isMediaMultiSource(source: AnyMediaSource): source is MediaMultiSource {
    return ('sources' in source);
}
