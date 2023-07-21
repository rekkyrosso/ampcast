import React, {useState} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import SearchBar from 'components/SearchBar';
import useSearch from 'hooks/useSearch';
import {MediaBrowserProps} from './MediaBrowser';
import MediaSourceSelector from './MediaSourceSelector';
import PageHeader from './PageHeader';
import PagedItems from './PagedItems';

export default function DefaultBrowser<T extends MediaObject>({
    service,
    sources,
}: MediaBrowserProps<T>) {
    const [source, setSource] = useState<MediaSource<T>>(() => sources[0]);
    const [query, setQuery] = useState('');
    const pager = useSearch(source, query);
    const searchable = !!source.searchable;
    const showPagerHeader = !searchable && !source.isPin;

    return (
        <>
            {showPagerHeader ? (
                <PageHeader icon={service.icon}>
                    {service.name}: {source.title}
                </PageHeader>
            ) : null}
            {searchable ? (
                <SearchBar
                    icon={service.icon}
                    placeholder={`Search ${service.name}`}
                    onSubmit={setQuery}
                />
            ) : null}
            {sources.length > 1 ? (
                <MediaSourceSelector sources={sources} onSourceChange={setSource} />
            ) : null}
            <PagedItems
                service={service}
                source={source}
                pager={pager}
                layout={source.layout}
                loadingText={query ? 'Searching' : undefined}
            />
        </>
    );
}
