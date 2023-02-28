import React, {useMemo} from 'react';
import {Except} from 'type-fest';
import ListView, {ListViewLayout, ListViewProps} from './ListView';
import './ListBox.scss';

export interface ListBoxProps<T> extends Except<ListViewProps<T>, 'layout'> {
    renderItem?: (item: T, rowIndex: number) => React.ReactNode;
}

export default function ListBox<T>({
    renderItem: render = String,
    className = '',
    ...props
}: ListBoxProps<T>) {
    const layout: ListViewLayout<T> = useMemo(() => {
        return {view: 'details', cols: [{render}]};
    }, [render]);

    return <ListView<T> {...props} className={`list-box ${className}`} layout={layout} />;
}
