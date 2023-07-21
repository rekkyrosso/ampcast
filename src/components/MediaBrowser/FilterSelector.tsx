import React, {useCallback, useEffect, useId, useState} from 'react';
import {from} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaService from 'types/MediaService';
import ViewType from 'types/ViewType';
import './FilterSelector.scss';

export interface FilterSelectorProps {
    service: MediaService;
    viewType: ViewType.ByDecade | ViewType.ByGenre;
    itemType: ItemType;
    onSelect?: (filter: MediaFilter) => void;
}

export default function FilterSelector({
    service,
    viewType,
    itemType,
    onSelect,
}: FilterSelectorProps) {
    const id = useId();
    const [filters, setFilters] = useState<readonly MediaFilter[]>([]);
    const [filter, setFilter] = useState<MediaFilter | undefined>();
    const title = viewType === ViewType.ByDecade ? 'Decade' : 'Genre';

    useEffect(() => {
        if (filter && onSelect) {
            onSelect(filter);
        }
    }, [filter, onSelect]);

    useEffect(() => {
        const subscription = from(service.getFilters!(viewType, itemType)).subscribe(setFilters);
        return () => subscription.unsubscribe();
    }, [service, viewType, itemType]);

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
        <div className="filter-selector">
            <label htmlFor={id}>{title}:</label>
            <select id={id} onChange={handleChange}>
                {filters.map((filter, index) => (
                    <option key={filter.id} value={index}>
                        {filter.title}
                    </option>
                ))}
            </select>
        </div>
    );
}
