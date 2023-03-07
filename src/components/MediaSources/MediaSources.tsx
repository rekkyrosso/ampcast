import React, {useEffect, useRef} from 'react';
import {LiteStorage} from 'utils';
import TreeView, {TreeViewHandle} from 'components/TreeView';
import useMediaSources from './useMediaSources';
import './MediaSources.scss';

console.log('component::MediaSources');

export const storage = new LiteStorage('sources');

export interface MediaSourcesProps {
    onSelect?: (source: React.ReactNode) => void;
}

export default function MediaSources({onSelect}: MediaSourcesProps) {
    const treeViewRef = useRef<TreeViewHandle>(null);
    const sources = useMediaSources();

    useEffect(() => {
        treeViewRef.current!.focus();
    }, []);

    return (
        <div className="panel media-sources">
            <TreeView<React.ReactNode>
                roots={sources}
                onSelect={onSelect}
                storageId={storage.id}
                treeViewRef={treeViewRef}
            />
        </div>
    );
}
