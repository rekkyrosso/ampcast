import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import Visualizer from 'types/Visualizer';
import VisualizerProvider from 'types/VisualizerProvider';
import {LiteStorage} from 'utils';

type VisualizerKeys = Pick<Visualizer, 'provider' | 'name'>;

export interface VisualizerSettings {
    ambientVideoEnabled?: boolean;
    ambientVideoSource?: string;
    useAmbientVideoSource?: boolean;
    provider?: VisualizerProvider;
    lockedVisualizer?: VisualizerKeys;
}

const storage = new LiteStorage('visualizerSettings');

const visualizerSettings: VisualizerSettings = {
    get ambientVideoEnabled(): boolean {
        return storage.getBoolean('ambientVideoEnabled');
    },

    set ambientVideoEnabled(ambientVideoEnabled: boolean) {
        if (ambientVideoEnabled !== this.ambientVideoEnabled) {
            storage.setBoolean('ambientVideoEnabled', ambientVideoEnabled);
            settings$.next(this);
        }
    },

    get ambientVideoSource(): string {
        return storage.getString('ambientVideoSource');
    },

    set ambientVideoSource(ambientVideoSource: string) {
        if (ambientVideoSource !== this.ambientVideoSource) {
            storage.setString('ambientVideoSource', ambientVideoSource);
            settings$.next(this);
        }
    },

    get useAmbientVideoSource(): boolean {
        return storage.getBoolean('useAmbientVideoSource');
    },

    set useAmbientVideoSource(useAmbientVideoSource: boolean) {
        if (useAmbientVideoSource !== this.useAmbientVideoSource) {
            storage.setBoolean('useAmbientVideoSource', useAmbientVideoSource);
            settings$.next(this);
        }
    },

    get lockedVisualizer(): VisualizerKeys | undefined {
        return storage.getJson('lockedVisualizer') || undefined;
    },

    set lockedVisualizer(lockedVisualizer: VisualizerKeys | undefined) {
        if (lockedVisualizer) {
            const {provider, name} = lockedVisualizer;
            storage.setJson('lockedVisualizer', {provider, name});
        } else {
            storage.removeItem('lockedVisualizer');
        }
        settings$.next(this);
    },

    get provider(): VisualizerProvider {
        return storage.getString('provider');
    },

    set provider(provider: VisualizerProvider) {
        if (provider !== this.provider) {
            storage.setString('provider', provider);
            settings$.next(this);
        }
    },
};

const settings$ = new BehaviorSubject<VisualizerSettings>(visualizerSettings);

export default visualizerSettings;

export function observeSettings(): Observable<VisualizerSettings> {
    return settings$;
}

export function observeLocked(): Observable<boolean> {
    return observeSettings().pipe(
        map((settings) => !!settings.lockedVisualizer),
        distinctUntilChanged()
    );
}

export function observeProvider(): Observable<VisualizerProvider | ''> {
    return observeSettings().pipe(
        map((settings) => settings.provider || ''),
        distinctUntilChanged()
    );
}
