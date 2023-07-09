import React, {useEffect, useRef} from 'react';
import {LiteStorage} from 'utils';
import {showDialog} from 'components/Dialog';
import TreeView, {TreeViewHandle} from 'components/TreeView';
import MediaLibrarySettingsDialog from 'components/Settings/MediaLibrarySettings/MediaLibrarySettingsDialog';
import useMediaSources from './useMediaSources';
import './MediaSources.scss';

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

    useEffect(() => {
        if (sources?.length === 0) {
            showDialog(MediaLibrarySettingsDialog, true);
        }
    }, [sources]);

    return (
        <div className="panel media-sources">
            <TreeView<React.ReactNode>
                roots={sources || []}
                onSelect={onSelect}
                storageId={storage.id}
                treeViewRef={treeViewRef}
            />
        </div>
    );
}
