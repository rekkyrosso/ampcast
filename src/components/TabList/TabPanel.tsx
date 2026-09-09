import React from 'react';
import {TabItem} from './TabList';

export interface TabPanelProps {
    id: string;
    item: TabItem;
    index: number;
    hidden: boolean;
}

export default function TabPanel({id, item, index, hidden}: TabPanelProps) {
    const className = item.prefix ? `tab-panel-${item.prefix}` : '';

    return (
        <div
            className={`tab-panel ${className}`}
            id={`${id}-panel-${index}`}
            hidden={hidden}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${index}`}
        >
            {item.panel}
        </div>
    );
}
