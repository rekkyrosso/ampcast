import React, {Suspense, lazy, useEffect} from 'react';
import {firstValueFrom, map} from 'rxjs';
import {
    loadVisualizers,
    observeVisualizerComponents,
} from 'services/visualizer/visualizerProviders';

const LazyVisualizerSettings = lazy(() => getVisualizerSettings());

export default function VisualizerSettings() {
    useEffect(() => {
        loadVisualizers();
    }, []);

    return (
        <Suspense fallback={<div className="visualizer-settings" />}>
            <LazyVisualizerSettings />
        </Suspense>
    );
}

function getVisualizerSettings(): Promise<{default: React.FC}> {
    return firstValueFrom(
        observeVisualizerComponents().pipe(map(({Settings}) => ({default: Settings})))
    );
}
