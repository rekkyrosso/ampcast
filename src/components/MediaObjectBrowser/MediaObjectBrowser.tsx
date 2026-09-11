import React from 'react';
import MediaObject from 'types/MediaObject';
import MediaObjectHeader from './MediaObjectHeader';
import MediaObjectTabs from './MediaObjectTabs';
import './MediaObjectBrowser.scss';

export interface MediaObjectBrowserProps<T extends MediaObject> {
    item: T;
    itemList: React.ReactNode;
    children?: React.ReactNode;
}

export default function MediaObjectBrowser<T extends MediaObject>({
    item,
    itemList,
    children,
}: MediaObjectBrowserProps<T>) {
    return (
        <div className="panel media-object-browser">
            <div className="media-object-browser-content">
                <MediaObjectHeader>{itemList}</MediaObjectHeader>
                <MediaObjectTabs item={item}>{children}</MediaObjectTabs>
            </div>
        </div>
    );
}
