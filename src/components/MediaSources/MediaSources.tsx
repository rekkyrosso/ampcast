import React, {useEffect, useRef, useState} from 'react';
import {LiteStorage} from 'utils';
import TreeView, {TreeViewHandle} from 'components/TreeView';
import useMediaSources from './useMediaSources';
import {showDialog} from 'components/Dialog';
import StartupWizard from 'components/StartupWizard';

export const storage = new LiteStorage('sources');

export interface MediaSourcesProps {
    onSelect?: (source: React.ReactNode) => void;
}

export default function MediaSources({onSelect}: MediaSourcesProps) {
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
