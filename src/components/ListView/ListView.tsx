import './ListView.scss';
import React, {useCallback, useRef, useState} from 'react';
import SortOrder from 'types/SortOrder';

type SubType<Base, Condition> = Pick<Base, {
    [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
}[keyof Base]>;

export type TypeHint = 'string' | 'number' | 'boolean' | 'time' | 'date';

export interface ColumnSpec<T> {
    readonly key: keyof T | '#';
    readonly title: string;
    readonly width?: number;
    readonly sortOrder?: SortOrder;
    readonly sortPriority?: number;
    readonly typeHint?: TypeHint;// TODO: Pick a format library.
}

export interface ListViewLayout<T> {
    readonly view: 'details'; // this is the only one so far
    readonly cols: readonly ColumnSpec<T>[];
}

export interface ListViewProps<T> {
    readonly items: readonly T[];
    readonly itemKey: keyof SubType<T, string | number>;
    readonly layout: ListViewLayout<T>;
    readonly searchable?: boolean;
    readonly sortable?: boolean;
    readonly sizeable?: boolean;
    readonly draggable?: boolean;
    readonly droppable?: readonly string[]; // mime types
    readonly className?: string;
    readonly onDrop?: (event: React.DragEvent) => void; 
}

export default function ListView<T>({
    items,
    itemKey,
    layout,
    className = '',
    onDrop
}: ListViewProps<T>) {
    const ref = useRef<HTMLTableElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (selectedIndex > 0) {
                ref.current?.rows[selectedIndex - 1]?.scrollIntoView({block: 'nearest'});
                event.stopPropagation();
                setSelectedIndex(selectedIndex - 1);
            }
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (selectedIndex < items.length - 1) {
                ref.current?.rows[selectedIndex + 2]?.scrollIntoView({block: 'nearest'});
                event.stopPropagation();
                setSelectedIndex(selectedIndex + 1);

            }
        }
    }, [selectedIndex, setSelectedIndex]);

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
    }, []);

    return (
        <div
            role="listbox"
            className={`list-view ${className}`}
            tabIndex={0}
            onDragOver={handleDragOver}
            onDrop={onDrop}
            onKeyDown={handleKeyDown}
        >
            <table ref={ref}>
                <thead>
                    <tr>{
                        layout.cols.map(col => (
                            <th className={`type-${col.typeHint || 'string'}`} key={col.key as string}>{
                                col.title
                            }</th>
                        ))
                    }</tr>
                </thead>
                <tbody>{
                    items.map((item, index) => (
                        <tr
                            role="option"
                            aria-selected={index === selectedIndex ? 'true' : undefined}
                            className={index === selectedIndex ? 'selected' : undefined}
                            onMouseDown={() => setSelectedIndex(index)}
                            key={item[itemKey] as any}
                        >{
                            layout.cols.map(col => (
                                <td className={`type-${col.typeHint || 'string'}`} key={col.key as string}><span>{
                                    col.key === '#' ? `${index + 1}.` : format(item[col.key], col.typeHint)
                                }</span></td>
                            ))
                        }</tr>
                    ))
                }</tbody>
            </table>
        </div>
    );
}

function format(data: any, typeHint: TypeHint = 'string'): string {
    if (data == null) {
        return '';
    }
    if (typeHint === 'time') {
        const pad = (n: number) => (n < 10 ? '0' : '') + n;
        const hours   = Math.floor(data / 3600);
        const minutes = Math.floor((data - (hours * 3600)) / 60);
        const seconds = data - (hours * 3600) - (minutes * 60);
        return hours === 0 ? `${minutes}:${pad(seconds)}` : `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return String(data);
}
