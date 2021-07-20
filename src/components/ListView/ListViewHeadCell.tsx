import React from 'react';
import {Column} from './ListView';

export default function ListViewHeadCell<T>({style, title}: Column<T>) {
    return (
        <div className="list-view-cell" style={style}>
            {title}
        </div>
    );
}
