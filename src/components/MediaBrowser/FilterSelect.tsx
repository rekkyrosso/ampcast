import React, {useCallback, useEffect, useId, useState} from 'react';
import {from} from 'rxjs';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaService from 'types/MediaService';
import './FilterSelect.scss';

export interface FilterSelectProps {
    service: MediaService;
    filterType: FilterType;
    itemType: ItemType;
    onSelect?: (filter: MediaFilter) => void;
}

export default function FilterSelect({service, filterType, itemType, onSelect}: FilterSelectProps) {
    const id = useId();
    const [filters, setFilters] = useState<readonly MediaFilter[]>([]);
    const [filter, setFilter] = useState<MediaFilter | undefined>();
    const title =
        filterType === FilterType.ByDecade
            ? 'Decade'
            : service.id === 'spotify'
            ? 'Category'
            : 'Genre';

    useEffect(() => {
        if (filter && onSelect) {
            onSelect(filter);
        }
    }, [filter, onSelect]);

    useEffect(() => {
        const subscription = from(service.getFilters!(filterType, itemType)).subscribe(setFilters);
        return () => subscription.unsubscribe();
    }, [service, filterType, itemType]);

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
            <label htmlFor={id}>{title}:</label>
            <select id={id} onChange={handleChange}>
                {filters.map((filter, index) => (
                    <option value={index} key={filter.id}>
                        {filter.title}
                    </option>
                ))}
            </select>
        </div>
    );
}
