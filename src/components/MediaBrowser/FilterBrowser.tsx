import React, {useState} from 'react';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import useSource from 'hooks/useSource';
import PageHeader from './PageHeader';
import PagedItems from './PagedItems';
import FilterSelect from './FilterSelect';

export interface FilterBrowserProps<T extends MediaObject> {
    service: MediaService;
    source: MediaSource<T>;
}

export default function FilterBrowser<T extends MediaObject>({
    service,
    source,
}: FilterBrowserProps<T>) {
    const [filter, setFilter] = useState<MediaFilter | undefined>();
    const pager = useSource(source, filter);

    return (
        <>
            <PageHeader icon={service.icon}>
                {service.name}: {source.title}
            </PageHeader>
            <FilterSelect
                service={service}
                filterType={source.filterType!}
                itemType={source.itemType}
                onSelect={setFilter}
            />
            <PagedItems service={service} source={source} pager={pager} layout={source.layout} />
        </>
    );
}
