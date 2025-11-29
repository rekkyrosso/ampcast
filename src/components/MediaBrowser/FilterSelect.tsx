import React, {useCallback, useEffect, useId, useState} from 'react';
import {defer} from 'rxjs';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaService from 'types/MediaService';
import './FilterSelect.scss';

export interface FilterSelectProps {
    service: MediaService;
    filterType: FilterType;
    itemType: ItemType;
    onError?: (error: unknown) => void;
    onSelect?: (filter: MediaFilter) => void;
}

export default function FilterSelect({
    service,
    filterType,
    itemType,
    onError,
    onSelect,
}: FilterSelectProps) {
    const id = useId();
    const [filters, setFilters] = useState<readonly MediaFilter[]>([]);
    const [filter, setFilter] = useState<MediaFilter | undefined>();
    const filterName = useFilterName(filterType, service.id);

    useEffect(() => {
        if (filter && onSelect) {
            onSelect(filter);
        }
    }, [filter, onSelect]);

    useEffect(() => {
        const subscription = defer(() => service.getFilters!(filterType, itemType)).subscribe({
            next: setFilters,
            error: onError,
        });
        return () => subscription.unsubscribe();
    }, [service, filterType, itemType, onError]);

    useEffect(() => {
        if (!filter) {
            setFilter(filters[0]);
        }
    }, [filters, filter]);

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            setFilter(filters[Number(event.target.value)]);
        },
        [filters]
    );

    return (
        <div className="filter-select">
            <label htmlFor={id}>{filterName}:</label>
            <select id={id} onChange={handleChange}>
                {filters.map((filter, index) => (
                    <option value={index} key={filter.id}>
                        {filter.title}{filter.count === undefined ? '' : ` (${filter.count})`}
                    </option>
                ))}
            </select>
        </div>
    );
}

function useFilterName(filterType: FilterType, serviceId: string): string {
    switch (filterType) {
        case FilterType.ByCountry:
            return 'Country';

        case FilterType.ByDecade:
            return 'Decade';

        case FilterType.ByGenre:
            return serviceId === 'spotify' ? 'Category' : 'Genre';

        case FilterType.ByMood:
            return 'Mood';

        case FilterType.ByStyle:
            return 'Style';

        default:
            return 'Select';
    }
}
