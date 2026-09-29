import React, {useCallback, useEffect, useRef, useState} from 'react';
import {LiteStorage} from 'utils';
import {getServiceFromPath} from 'services/mediaServices';
import {getVisibleServices} from 'services/mediaServices/servicesSettings';
import {showDialog} from 'components/Dialog';
import StartupWizard from 'components/StartupWizard';
import TreeView, {TreeViewHandle} from 'components/TreeView';
import useHistory from 'components/MediaBrowser/useHistory';
import useOnResize, {ResizeRect} from 'hooks/useOnResize';
import useMediaSources from './useMediaSources';
import showMediaSourcesMenu from './showMediaSourcesMenu';

const storage = new LiteStorage('sources');

export interface MediaSourcesProps {
    onClick?: (source: string) => void;
    onResize?: (rect: ResizeRect) => void;
    onSelect?: (source: string) => void;
    ref?: React.RefObject<TreeViewHandle | null>;
}

export default function MediaSources({onClick, onResize, onSelect, ref}: MediaSourcesProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sources = useMediaSources();
    const {refresh} = useHistory();
    const [wizardShown, setWizardShown] = useState(false);

    useEffect(() => {
        ref?.current?.focus();
    }, [ref]);

    const showStartupWizard = useCallback(async () => {
        const classList = document.body.classList;
        classList.toggle('showing-startup-wizard', true);
        await showDialog(StartupWizard, true);
        classList.toggle('showing-startup-wizard', false);
        if (getVisibleServices().length > 0) {
            refresh();
        }
    }, [refresh]);

    useEffect(() => {
        if (sources) {
            const useWizard = sources.length === 0 && !wizardShown;
            setWizardShown(true);
            if (useWizard) {
                storage.clear();
                showStartupWizard();
            }
        }
    }, [sources, wizardShown, showStartupWizard]);

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
                onClick={onClick}
                onContextMenu={handleContextMenu}
                onSelect={onSelect}
                storageId={storage.id}
                ref={ref}
            />
        </div>
    );
}
