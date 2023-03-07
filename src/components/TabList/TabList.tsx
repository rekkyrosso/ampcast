import React, {useCallback, useId, useLayoutEffect, useRef, useState} from 'react';
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
    const tabsRef = useRef<HTMLUListElement>(null);
    const [buttons, setButtons] = useState<HTMLButtonElement[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useLayoutEffect(() => {
        setButtons(Array.from(tabsRef.current!.querySelectorAll('button')));
    }, []);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            let currentIndex = selectedIndex;
            if (event.code === 'ArrowRight') {
                event.stopPropagation();
                currentIndex++;
            } else if (event.code === 'ArrowLeft') {
                event.stopPropagation();
                currentIndex--;
            }
            currentIndex = Math.min(Math.max(currentIndex, 0), buttons.length - 1);
            const button = buttons[currentIndex];
            if (button && !button.disabled) {
                button.focus();
            }
        },
        [selectedIndex, buttons]
    );

    const handleFocus = useCallback((event: React.FocusEvent) => {
        const button = event.target as HTMLButtonElement;
        if (button.id) {
            const index = Number(button.id.split('-').pop());
            setSelectedIndex(index);
        }
    }, []);

    return (
        <div className={`tab-list ${className}`}>
            <ul
                className="tab-list-tabs"
                role="tablist"
                aria-label={label}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                ref={tabsRef}
            >
                {items.map((item, index) => (
                    <li role="presentation" key={index}>
                        <Tab id={id} item={item} index={index} selected={index === selectedIndex} />
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
