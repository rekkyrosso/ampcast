import React from 'react';
import {preventDefault} from 'utils';
import './AppDragRegion.scss';

export default function AppDragRegion() {
    return <div className="app-drag-region" onContextMenu={preventDefault} />;
}
