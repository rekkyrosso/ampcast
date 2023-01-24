import React, {useCallback} from 'react';
import {TabItem} from './TabList';

export interface TabProps {
    id: string;
    item: TabItem;
    index: number;
    selected: boolean;
    onSelect: (index: number) => void;
}

export default function Tab({id, item, index, selected, onSelect}: TabProps) {
    const select = useCallback(() => onSelect(index), [index, onSelect]);

    return (
        <button
            className="tab"
            id={`${id}-tab-${index}`}
            role="tab"
            aria-selected={selected}
            aria-controls={`${id}-panel-${index}`}
            onClick={select}
            onFocus={select}
        >
            {item.tab}
        </button>
    );
}
