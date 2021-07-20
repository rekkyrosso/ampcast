import React from 'react';
import {storage} from 'services/mediaSources';
import TreeView from 'components/TreeView';
import useMediaSources from './useMediaSources';
import './MediaSources.scss';

console.log('component::MediaSources');

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
