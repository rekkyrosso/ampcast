import React, {useCallback, useMemo} from 'react';
import ListView, {ListViewLayout, ListViewHandle} from './ListView';
import './DetailsBox.scss';

export interface DetailsBoxProps<T extends object> {
    object: T;
    renderItem?: (value: any, key: keyof T) => React.ReactNode;
    title: string;
    className?: string;
    storageId?: string;
    onSelect?: (value: any, key: keyof T) => void;
    ref?: React.RefObject<ListViewHandle | null>;
}

export default function DetailsBox<T extends object>({
    object,
    renderItem = String,
    className = '',
    onSelect,
    ...props
}: DetailsBoxProps<T>) {
    type ListItem = {key: keyof T; value: any};
    const items: ListItem[] = useMemo(() => {
        return (Object.keys(object) as (keyof T)[])
            .filter((key) => typeof key === 'string')
            .filter((key) => object[key] !== undefined)
            .sort((a, b) => a.localeCompare(b))
            .map((key) => ({key, value: object[key]}));
    }, [object]);
    const layout: ListViewLayout<ListItem> = useMemo(() => {
        return {
            view: 'details',
            showTitles: true,
            sizeable: true,
            cols: [
                {
                    className: 'key',
                    title: 'Key',
                    render: ({key}) => key as string,
                    width: 10,
                    align: 'right'
                },
                {
                    className: 'value',
                    title: 'Value',
                    render: ({key, value}) => renderItem(value, key),
                    width: 32,
                },
            ],
        };
    }, [renderItem]);

    const handleSelect = useCallback(
        ([item]: readonly ListItem[]) => {
            if (item && onSelect) {
                const {key, value} = item;
                onSelect(value, key);
            }
        },
        [onSelect]
    );

    return (
        <ListView<ListItem>
            {...props}
            items={items}
            itemKey={'key' as any}
            className={`details-box ${className}`}
            layout={layout}
            onSelect={handleSelect}
        />
    );
}
