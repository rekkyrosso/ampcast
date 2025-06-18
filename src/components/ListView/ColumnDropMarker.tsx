import React from 'react';
import {Column} from './ListView';

export interface ColumnDropZoneProps {
    col: Column<any>;
    fontSize: number;
}

export default function ColumnDropMarker({col, fontSize}: ColumnDropZoneProps) {
    return (
        <span
            className="column-drop-marker"
            style={{
                left: `${col.left * fontSize}px`,
            }}
        />
    );
}
