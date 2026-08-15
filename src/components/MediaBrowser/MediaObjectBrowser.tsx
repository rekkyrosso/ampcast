import React, {useEffect} from 'react';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import {MediaObjectSource} from 'types/MediaSource';
import MediaInfo from 'components/MediaInfo';
import Scrollable from 'components/Scrollable';
import usePager from 'hooks/usePager';
import useSource from 'hooks/useSource';
import './MediaObjectBrowser.scss';

export interface MediaObjectBrowserProps<T extends MediaObject> {
    service: MediaService;
    source: MediaObjectSource<T>;
}

export default function MediaObjectBrowser<T extends MediaObject>({
    source,
}: MediaObjectBrowserProps<T>) {
    const pager = useSource(source);
    const [{items: [item] = []}, fetchAt] = usePager(pager);

    useEffect(() => {
        fetchAt(0, 1);
    }, [fetchAt, pager]);

    return (
        <div className="panel media-object-browser">
            {item ? (
                <Scrollable>
                    <div className="media-object-browser-content">
                        <MediaInfo item={item} />
                        <MediaDetail item={item} />
                    </div>
                </Scrollable>
            ) : null}
        </div>
    );
}

function MediaDetail<T extends MediaObject>({item}: {item: T | undefined}) {
    switch (item?.itemType) {
        default:
            return null; // Not implemented.
    }
}
