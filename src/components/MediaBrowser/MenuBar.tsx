import React from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import MenuButton from './MenuButton';
import './MenuBar.scss';

export interface MenuBarProps<T extends MediaObject> {
    source: MediaSource<T>;
}

export default function MenuBar<T extends MediaObject>({source}: MenuBarProps<T>) {
    return (
        <div className="menu-bar">
            <MenuButton source={source} />
        </div>
    );
}
