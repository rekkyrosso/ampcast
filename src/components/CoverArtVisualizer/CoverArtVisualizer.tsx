import React, {Suspense, lazy} from 'react';
import {filter, firstValueFrom, map, mergeMap} from 'rxjs';
import {CoverArtVisualizer as CoverArt} from 'types/Visualizer';
import VisualizerProvider from 'types/VisualizerProvider';
import {observeVisualizerProviders} from 'services/visualizer/visualizerProviders';

const LazyCoverArtVisualizer = lazy(() => getCoverArtVisualizer());

export default function CoverArtVisualizer() {
    return (
        <Suspense fallback={<div className="visualizer visualizer-coverart" />}>
            <LazyCoverArtVisualizer />
        </Suspense>
    );
}

async function getCoverArtVisualizer(): Promise<{default: React.FC}> {
    return firstValueFrom(
        observeVisualizerProviders().pipe(
            mergeMap((providers) => providers),
            filter(isCoverArtProvider),
            map((provider) => provider.visualizers[0].component),
            map((component) => ({default: component}))
        )
    );
}

function isCoverArtProvider(
    provider: VisualizerProvider
): provider is VisualizerProvider<CoverArt> {
    return provider.id === 'coverart';
}
