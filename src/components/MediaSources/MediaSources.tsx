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
    ref?: React.RefObject<TreeViewHandle | null>;
}

export default function MediaSources({onResize, onSelect, ref}: MediaSourcesProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sources = useMediaSources();
    const [wizardShown, setWizardShown] = useState(false);

    useEffect(() => {
        ref?.current?.focus();
    }, [ref]);

    useEffect(() => {
        if (sources) {
            const useWizard = sources.length === 0 && !wizardShown;
            setWizardShown(true);
            if (useWizard) {
                showDialog(StartupWizard, true);
            }
        }
    }, [sources, wizardShown]);

    useOnResize(containerRef, (rect) => onResize?.(rect));

    const handleContextMenu = useCallback(async (path: string, x: number, y: number) => {
        const service = getServiceFromPath(path);
        if (service) {
            showMediaSourcesMenu(service, containerRef.current!, x, y);
        }
    }, []);

    return (
        <div className="panel media-sources" ref={containerRef}>
            <TreeView<string>
                roots={sources || []}
                onContextMenu={handleContextMenu}
                onSelect={onSelect}
                storageId={storage.id}
                ref={ref}
            />
        </div>
    );
}
