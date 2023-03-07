import React from 'react';
import {TabItem} from './TabList';

export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    item: TabItem;
    index: number;
    selected: boolean;
}

export default function Tab({id, item, index, selected, ...props}: TabProps) {
    return (
        <button
            {...props}
            className="tab"
            id={`${id}-tab-${index}`}
            tabIndex={selected ? 0 : -1}
            role="tab"
            aria-selected={selected}
            aria-controls={`${id}-panel-${index}`}
        >
            {item.tab}
        </button>
    );
}
