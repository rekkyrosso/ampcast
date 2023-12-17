import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map} from 'rxjs';
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
            settings$.next(this);
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
            settings$.next(this);
        }
    },

    get ambientVideoBeats(): boolean {
        return storage.getBoolean('ambientVideoBeats', true);
    },

    set ambientVideoBeats(ambientVideoBeats: boolean) {
        if (ambientVideoBeats !== this.ambientVideoBeats) {
            storage.setBoolean('ambientVideoBeats', ambientVideoBeats);
            settings$.next(this);
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
            settings$.next(this);
        }
    },

    get coverArtAnimatedBackground(): boolean {
        return storage.getBoolean('coverArtAnimatedBackground');
    },

    set coverArtAnimatedBackground(coverArtAnimatedBackground: boolean) {
        if (coverArtAnimatedBackground !== this.coverArtAnimatedBackground) {
            storage.setBoolean('coverArtAnimatedBackground', coverArtAnimatedBackground);
            settings$.next(this);
        }
    },

    get coverArtBeats(): boolean {
        return storage.getBoolean('coverArtBeats', true);
    },

    set coverArtBeats(coverArtBeats: boolean) {
        if (coverArtBeats !== this.coverArtBeats) {
            storage.setBoolean('coverArtBeats', coverArtBeats);
            settings$.next(this);
        }
    },

    get fullscreenProgress(): boolean {
        return storage.getBoolean('fullscreenProgress');
    },

    set fullscreenProgress(fullscreenProgress: boolean) {
        if (fullscreenProgress !== this.fullscreenProgress) {
            storage.setBoolean('fullscreenProgress', fullscreenProgress);
            settings$.next(this);
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
        settings$.next(this);
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
            settings$.next(this);
        }
    },
};

const settings$ = new BehaviorSubject<VisualizerSettings>(visualizerSettings);

export default visualizerSettings;

export function observeVisualizerSettings(): Observable<VisualizerSettings> {
    return settings$;
}

export function observeFullscreenProgressEnabled(): Observable<boolean> {
    return observeVisualizerSettings().pipe(
        map((settings) => settings.fullscreenProgress),
        distinctUntilChanged()
    );
}
