import React, {useCallback, useId, useState} from 'react';
import Button from 'components/Button';
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

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        switch (event.key) {
            case 'left':
                event.preventDefault();
                if (selectedIndex > 0) {
                    setSelectedIndex(selectedIndex - 1);
                    event.stopPropagation();
                }
                break;

            case 'right':
                event.preventDefault();
                if (selectedIndex < size - 1) {
                    setSelectedIndex(selectedIndex + 1);
                    event.stopPropagation();
                }
                break;
        }
    }, [selectedIndex, size]);

    return (
        <div className={`tab-list ${className}`}>
            <ul className="tab-list-tabs" role="tablist" aria-label={label} onKeyDown={handleKeyDown}>
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

export interface TabProps {
    id: string;
    item: TabItem;
    index: number;
    selected: boolean;
    onSelect: (index: number) => void;
}

function Tab({id, item, index, selected, onSelect}: TabProps) {
    const handleFocus = useCallback(() => onSelect(index), [index, onSelect]);

    return (
        <Button
            className="tab"
            id={`${id}-tab-${index}`}
            tabIndex={selected ? 0 : -1}
            role="tab"
            aria-selected={selected}
            aria-controls={`${id}-panel-${index}`}
            onFocus={handleFocus}
        >
            {item.tab}
        </Button>
    );
}

export interface TabPanelProps {
    id: string;
    item: TabItem;
    index: number;
    hidden: boolean;
}

function TabPanel({id, item, index, hidden}: TabPanelProps) {
    return (
        <div
            className="tab-panel"
            id={`${id}-panel-${index}`}
            tabIndex={0}
            hidden={hidden}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${index}`}
        >
            {item.panel}
        </div>
    );
}
