import React, {useEffect, useState} from 'react';
import MediaSource, {AnyMediaSource, MediaMultiSource} from 'types/MediaSource';
import actionsStore from 'services/actions/actionsStore';
import SearchBar from 'components/SearchBar';
import useSearch from 'hooks/useSearch';
import {MediaBrowserProps} from './MediaBrowser';
import MediaSourceSelector from './MediaSourceSelector';
import MenuBar from './MenuBar';
import PageHeader from './PageHeader';
import PagedItems from './PagedItems';
import useSortedSources from './useSortedSources';

export default function DefaultBrowser({service, source}: MediaBrowserProps) {
    const sources = useSortedSources(
        isMediaMultiSource(source) ? source.sources : [source as MediaSource]
    );
    const [selectedSource, setSelectedSource] = useState<MediaSource>(sources[0]);
    const [query, setQuery] = useState('');
    const pager = useSearch(selectedSource, query);
    const searchable = !!source.searchable;
    const showPagerHeader = !searchable && !source.isPin;

    useEffect(() => {
        if (selectedSource?.lockActionsStore) {
            actionsStore.lock(service.id, selectedSource.itemType);
        } else {
            actionsStore.unlock();
        }
    }, [service, selectedSource]);

    useEffect(() => {
        // Commit unsaved changes.
        return () => actionsStore.unlock();
    }, [selectedSource]);

    return (
        <>
            {showPagerHeader ? (
                <PageHeader icon={service.icon} source={selectedSource}>
                    {source === service.root ? service.name : `${service.name}: ${source.title}`}
                </PageHeader>
            ) : null}
            {searchable ? (
                <SearchBar
                    name={`search-${service.id}`}
                    icon={service.icon}
                    placeholder={selectedSource.searchPlaceholder || `Search ${service.name}`}
                    onSubmit={setQuery}
                />
            ) : null}
            {sources.length > 1 ? (
                <MediaSourceSelector
                    sources={sources}
                    onSourceChange={setSelectedSource}
                    withButtons={searchable}
                />
            ) : showPagerHeader || selectedSource.isPin ? null : (
                <MenuBar source={selectedSource} />
            )}
            <PagedItems
                service={service}
                source={selectedSource}
                pager={pager}
                loadingText={query ? 'Searching' : undefined}
                emptyMessage={query ? 'No results' : undefined}
            />
        </>
    );
}

function isMediaMultiSource(source: AnyMediaSource): source is MediaMultiSource {
    return 'sources' in source;
}
