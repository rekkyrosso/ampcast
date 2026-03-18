import React, {useEffect, useState} from 'react';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import ErrorBox from 'components/Errors/ErrorBox';
import SearchBar from 'components/SearchBar';
import useSource from 'hooks/useSource';
import FilterSelect from './FilterSelect';
import MenuBar from './MenuBar';
import PageHeader from './PageHeader';
import PagedItems from './PagedItems';

export interface FilterBrowserProps<T extends MediaObject> {
    service: MediaService;
    source: MediaSource<T>;
}

export default function FilterBrowser<T extends MediaObject>({
    service,
    source,
}: FilterBrowserProps<T>) {
    const [filter, setFilter] = useState<MediaFilter | undefined>();
    const [query, setQuery] = useState('');
    const [params, setParams] = useState<MediaFilter | undefined>();
    const [error, setError] = useState<unknown>();
    const pager = useSource(source, params);

    useEffect(() => {
        if (filter) {
            setParams({...filter, q: query});
        }
    }, [filter, query]);

    return (
        <>
            {source.searchable ? (
                <SearchBar
                    name={`search-${source.id}`}
                    icon={service.icon}
                    placeholder={source.searchPlaceholder || `Search ${service.name}`}
                    onSubmit={setQuery}
                />
            ) : (
                <PageHeader icon={service.icon} source={source}>
                    {service.name}: {source.title}
                </PageHeader>
            )}
            <div className="filters">
                <FilterSelect
                    service={service}
                    filterType={source.filterType!}
                    itemType={source.itemType}
                    onError={setError}
                    onSelect={setFilter}
                />
                {source.searchable ? <MenuBar source={source} /> : null}
            </div>
            {error ? (
                <ErrorBox error={error} reportedBy="FilterSelect" reportingId={source.id} />
            ) : (
                <PagedItems service={service} source={source} pager={pager} />
            )}
        </>
    );
}
