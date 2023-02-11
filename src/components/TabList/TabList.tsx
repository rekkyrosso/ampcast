import React, {useCallback, useId, useState} from 'react';
import Tab from './Tab';
import TabPanel from './TabPanel';
import './TabList.scss';

export interface TabItem {
    readonly tab: React.ReactNode;
    readonly panel: React.ReactNode;
}

export interface TabListProps {
    className?: string;
    label: string;
    items: TabItem[];
}

export default function TabList({label, items, className = ''}: TabListProps) {
    const id = useId();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const size = items.length;

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    if (selectedIndex > 0) {
                        setSelectedIndex(selectedIndex - 1);
                        event.stopPropagation();
                    }
                    break;

                case 'ArrowRight':
                    event.preventDefault();
                    if (selectedIndex < size - 1) {
                        setSelectedIndex(selectedIndex + 1);
                        event.stopPropagation();
                    }
                    break;
            }
        },
        [selectedIndex, size]
    );

    return (
        <div className={`tab-list ${className}`}>
            <ul
                className="tab-list-tabs"
                role="tablist"
                aria-label={label}
                onKeyDown={handleKeyDown}
            >
                {items.map((item, index) => (
                    <li role="presentation" key={index}>
                        <Tab
                            id={id}
                            item={item}
                            index={index}
                            selected={index === selectedIndex}
                            onSelect={setSelectedIndex}
                        />
                    </li>
                ))}
            </ul>
            <div className="tab-list-panels">
                {items.map((item, index) => (
                    <TabPanel
                        id={id}
                        item={item}
                        index={index}
                        hidden={index !== selectedIndex}
                        key={index}
                    />
                ))}
            </div>
        </div>
    );
}
