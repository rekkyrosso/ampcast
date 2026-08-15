import React, {useCallback, useEffect, useRef, useState} from 'react';
import {LiteStorage} from 'utils';
import {getServiceFromPath} from 'services/mediaServices';
import {showDialog} from 'components/Dialog';
import StartupWizard from 'components/StartupWizard';
import TreeView, {TreeViewHandle} from 'components/TreeView';
import useOnResize, {ResizeRect} from 'hooks/useOnResize';
import useMediaSources from './useMediaSources';
import showMediaSourcesMenu from './showMediaSourcesMenu';

export const storage = new LiteStorage('sources');

export interface MediaSourcesProps {
    onResize?: (rect: ResizeRect) => void;
    onSelect?: (source: string) => void;
}

export default function MediaSources({onResize, onSelect}: MediaSourcesProps) {
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

    useOnResize(ref, (rect) => onResize?.(rect));

    const handleContextMenu = useCallback(async (path: string, x: number, y: number) => {
        const service = getServiceFromPath(path);
        if (service) {
            showMediaSourcesMenu(service, ref.current!, x, y);
        }
    }, []);

    return (
        <div className="panel media-sources" ref={ref}>
            <TreeView<string>
                roots={sources || []}
                onContextMenu={handleContextMenu}
                onSelect={onSelect}
                storageId={storage.id}
                ref={treeViewRef}
            />
        </div>
    );
}
