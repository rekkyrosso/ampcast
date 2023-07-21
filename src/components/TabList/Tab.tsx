import React, {useCallback} from 'react';
import {TabItem} from './TabList';

export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    item: TabItem;
    index: number;
    selected: boolean;
}

export default function Tab({id, item, index, selected, ...props}: TabProps) {
    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        // Safari doesn't focus buttons when you click on them.
        (event.target as HTMLButtonElement).focus();
    }, []);

    return (
        <button
            {...props}
            className="tab"
            type="button"
            id={`${id}-tab-${index}`}
            tabIndex={selected ? 0 : -1}
            role="tab"
            aria-selected={selected}
            aria-controls={`${id}-panel-${index}`}
            onMouseDown={handleMouseDown}
        >
            {item.tab}
        </button>
    );
}
