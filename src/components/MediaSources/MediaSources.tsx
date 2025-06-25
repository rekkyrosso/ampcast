import React, {useCallback, useEffect, useRef, useState} from 'react';
import MediaService from 'types/MediaService';
import {AnyMediaSource} from 'types/MediaSource';
import {LiteStorage} from 'utils';
import {showDialog} from 'components/Dialog';
import StartupWizard from 'components/StartupWizard';
import TreeView, {TreeViewHandle} from 'components/TreeView';
import useMediaSources from './useMediaSources';
import showMediaSourcesMenu from './showMediaSourcesMenu';

export const storage = new LiteStorage('sources');

export interface MediaSourceView {
    readonly source: MediaService | AnyMediaSource;
    readonly view: React.ReactNode;
}

export interface MediaSourcesProps {
    onSelect?: (source: MediaSourceView | null) => void;
}

export default function MediaSources({onSelect}: MediaSourcesProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const treeViewRef = useRef<TreeViewHandle>(null);
    const sources = useMediaSources();
    const [wizardShown, setWizardShown] = useState(false);

    useEffect(() => {
        treeViewRef.current!.focus();
    }, []);

    useEffect(() => {
        if (sources) {
            const useWizard = sources.length === 0 && !wizardShown;
            setWizardShown(true);
            if (useWizard) {
                showDialog(StartupWizard, true);
            }
        }
    }, [sources, wizardShown]);

    const handleContextMenu = useCallback(async (item: MediaSourceView, x: number, y: number) => {
        showMediaSourcesMenu(item, ref.current!, x, y);
    }, []);

    return (
        <div className="panel media-sources" ref={ref}>
            <TreeView<MediaSourceView>
                roots={sources || []}
                onContextMenu={handleContextMenu}
                onSelect={onSelect}
                storageId={storage.id}
                ref={treeViewRef}
            />
        </div>
    );
}
