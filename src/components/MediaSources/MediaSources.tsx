import React from 'react';
import {LiteStorage} from 'utils';
import TreeView from 'components/TreeView';
import useMediaSources from './useMediaSources';
import './MediaSources.scss';

console.log('component::MediaSources');

export const storage = new LiteStorage('sources');

export interface MediaSourcesProps {
    onSelect?: (source: React.ReactNode) => void;
}

export default function MediaSources({onSelect}: MediaSourcesProps) {
    const sources = useMediaSources();

    return (
        <div className="panel media-sources">
            <TreeView roots={sources} onSelect={onSelect} storeId={storage.id} />
        </div>
    );
}
