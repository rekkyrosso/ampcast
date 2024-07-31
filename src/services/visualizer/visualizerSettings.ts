import type {Observable} from 'rxjs';
import {distinctUntilChanged, map, startWith} from 'rxjs';
import Visualizer from 'types/Visualizer';
import VisualizerProviderId from 'types/VisualizerProviderId';
import {LiteStorage} from 'utils';

type VisualizerKeys = Pick<Visualizer, 'providerId' | 'name'>;

export interface VisualizerSettings {
    provider: VisualizerProviderId | '';
    ambientVideoBeats: boolean;
    ambientVideoEnabled: boolean;
    ambientVideoSource: string;
    useAmbientVideoSource: boolean;
    coverArtAnimatedBackground: boolean;
    coverArtBeats: boolean;
    fullscreenProgress: boolean;
    lockedVisualizer: VisualizerKeys | null;
}

const storage = new LiteStorage('visualizer/settings');

const visualizerSettings: VisualizerSettings = {
    get ambientVideoEnabled(): boolean {
        return storage.getBoolean('ambientVideoEnabled');
    },

    set ambientVideoEnabled(ambientVideoEnabled: boolean) {
        if (ambientVideoEnabled !== this.ambientVideoEnabled) {
            storage.setBoolean('ambientVideoEnabled', ambientVideoEnabled);
            if (!ambientVideoEnabled) {
                if (this.provider === 'ambientvideo') {
                    storage.setString('provider', '');
                }
                if (this.lockedVisualizer?.providerId === 'ambientvideo') {
                    storage.removeItem('lockedVisualizer');
                }
            }
        }
    },

    get ambientVideoSource(): string {
        return storage.getString('ambientVideoSource');
    },

    set ambientVideoSource(ambientVideoSource: string) {
        if (ambientVideoSource !== this.ambientVideoSource) {
            storage.setString('ambientVideoSource', ambientVideoSource);
            if (this.lockedVisualizer?.providerId === 'ambientvideo') {
                storage.removeItem('lockedVisualizer');
            }
        }
    },

    get ambientVideoBeats(): boolean {
        return storage.getBoolean('ambientVideoBeats', true);
    },

    set ambientVideoBeats(ambientVideoBeats: boolean) {
        if (ambientVideoBeats !== this.ambientVideoBeats) {
            storage.setBoolean('ambientVideoBeats', ambientVideoBeats);
        }
    },

    get useAmbientVideoSource(): boolean {
        return storage.getBoolean('useAmbientVideoSource');
    },

    set useAmbientVideoSource(useAmbientVideoSource: boolean) {
        if (useAmbientVideoSource !== this.useAmbientVideoSource) {
            storage.setBoolean('useAmbientVideoSource', useAmbientVideoSource);
            if (this.lockedVisualizer?.providerId === 'ambientvideo') {
                storage.removeItem('lockedVisualizer');
            }
        }
    },

    get coverArtAnimatedBackground(): boolean {
        return storage.getBoolean('coverArtAnimatedBackground');
    },

    set coverArtAnimatedBackground(coverArtAnimatedBackground: boolean) {
        if (coverArtAnimatedBackground !== this.coverArtAnimatedBackground) {
            storage.setBoolean('coverArtAnimatedBackground', coverArtAnimatedBackground);
        }
    },

    get coverArtBeats(): boolean {
        return storage.getBoolean('coverArtBeats', true);
    },

    set coverArtBeats(coverArtBeats: boolean) {
        if (coverArtBeats !== this.coverArtBeats) {
            storage.setBoolean('coverArtBeats', coverArtBeats);
        }
    },

    get fullscreenProgress(): boolean {
        return storage.getBoolean('fullscreenProgress');
    },

    set fullscreenProgress(fullscreenProgress: boolean) {
        if (fullscreenProgress !== this.fullscreenProgress) {
            storage.setBoolean('fullscreenProgress', fullscreenProgress);
        }
    },

    get lockedVisualizer(): VisualizerKeys | null {
        return storage.getJson('lockedVisualizer');
    },

    set lockedVisualizer(lockedVisualizer: VisualizerKeys | null) {
        if (lockedVisualizer) {
            const {providerId, name} = lockedVisualizer;
            storage.setJson<VisualizerKeys>('lockedVisualizer', {providerId, name});
        } else {
            storage.removeItem('lockedVisualizer');
        }
    },

    get provider(): VisualizerProviderId {
        return storage.getString('provider');
    },

    set provider(provider: VisualizerProviderId) {
        if (provider !== this.provider) {
            storage.setString('provider', provider);
            if (provider && this.lockedVisualizer?.providerId !== provider) {
                storage.removeItem('lockedVisualizer');
            }
        }
    },
};

export default visualizerSettings;

export function observeVisualizerSettings(): Observable<Readonly<VisualizerSettings>> {
    return storage.observeChanges().pipe(
        startWith(undefined),
        map(() => ({...visualizerSettings}))
    );
}

export function observeLockedVisualizer(): Observable<boolean> {
    return observeVisualizerSettings().pipe(
        map((settings) => !!settings.lockedVisualizer),
        distinctUntilChanged()
    );
}

export function observeVisualizerProviderId(): Observable<VisualizerProviderId | ''> {
    return observeVisualizerSettings().pipe(
        map((settings) => settings.provider),
        distinctUntilChanged()
    );
}

export function observeFullscreenProgressEnabled(): Observable<boolean> {
    return observeVisualizerSettings().pipe(
        map((settings) => settings.fullscreenProgress),
        distinctUntilChanged()
    );
}
