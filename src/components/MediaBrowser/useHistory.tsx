import React, {useCallback} from 'react';
import {BehaviorSubject, filter, fromEvent, map} from 'rxjs';
import {nanoid} from 'nanoid';
import MediaSource, {AnyMediaSource} from 'types/MediaSource';
import {Pinnable} from 'types/Pin';
import {exists, LiteStorage, Logger} from 'utils';
import {getServiceFromPath, isPersonalMediaService} from 'services/mediaServices';
import pinStore from 'services/pins/pinStore';
import useObservable from 'hooks/useObservable';
import ErrorScreen from './ErrorScreen';
import MediaBrowser from './MediaBrowser';

export interface HistoryEntry {
    readonly key: string;
    readonly node: React.ReactNode;
}

export type HistoryState = {
    readonly key: string;
    readonly path: string;
    readonly index: number;
    readonly libraryId?: string;
};

const MAX_SIZE = 20;

const logger = new Logger('history');

const storage = new LiteStorage('history', 'session');

const stack$ = new BehaviorSubject<HistoryEntry[]>(Array(storage.getNumber('length')));
const state$ = new BehaviorSubject<HistoryState | null>(null);

const observeStack = () => stack$;
const observeState = () => state$;

fromEvent<PopStateEvent>(window, 'popstate')
    .pipe(map((event) => event.state))
    .subscribe((state) => {
        const stack = stack$.value.slice();
        if (state) {
            const {key, path, index} = state;
            const historyItem = stack.find((entry) => entry?.key === key);
            if (!historyItem) {
                const entry = createHistoryEntry(key, path);
                stack[index] = entry;
            }
            storage.setNumber('index', index);
            state$.next({...state});
            stack$.next(stack);
        } else {
            const key = nanoid();
            const path = location.hash.slice(1).replace('!/', '');
            const index = storage.getNumber('index') + 1;
            const libraryId = getLibraryId(path);
            const entry = createHistoryEntry(key, path);
            stack[index] = entry;
            stack.length = index + 1;
            storage.setNumber('index', index);
            storage.setNumber('length', index + 1);
            state$.next({key, path, index, libraryId});
            stack$.next(stack);
        }
    });

state$.pipe(filter(exists)).subscribe((state) => {
    const stack = stack$.value.slice();
    let expiredIndex = state.index - MAX_SIZE;
    if (expiredIndex >= 0) {
        while (expiredIndex >= 0) {
            delete stack[expiredIndex];
            expiredIndex--;
        }
        stack$.next(stack);
    }
});

export default function useHistory() {
    const stack = useObservable(observeStack, stack$.value);
    const state = useObservable(observeState, state$.value);

    const back = useCallback(() => {
        history.back();
    }, []);

    const forward = useCallback(() => {
        history.forward();
    }, []);

    const expire = useCallback((key: string) => {
        const currentKey = state$.value?.key;
        if (key !== currentKey) {
            const stack = stack$.value.slice();
            const index = stack.findIndex((entry) => entry?.key === key);
            if (index !== -1) {
                delete stack[index];
                stack$.next(stack);
            }
        }
    }, []);

    const refresh = useCallback(() => {
        const state = state$.value;
        if (state) {
            const stack = stack$.value.slice();
            const {path, index} = state;
            const key = nanoid(); // New `key`.
            stack[index] = createHistoryEntry(key, path);
            history.replaceState({...state, key}, '', `#!/${path}`);
            state$.next({...state, key});
            stack$.next(stack);
        }
    }, []);

    const switchLibrary = useCallback((libraryId: string) => {
        const state = state$.value;
        if (state) {
            const stack = stack$.value.slice();
            const key = nanoid(); // New `key`.
            let [path] = state.path.split('?');
            if (libraryId && getMediaSource(state.path)) {
                path = `${path}?libraryId=${libraryId}`;
            }
            stack[state.index] = createHistoryEntry(key, path);
            history.replaceState({...state, key, libraryId}, '', `#!/${path}`);
            state$.next({...state, key, libraryId});
            stack$.next(stack);
        }
    }, []);

    const navigateTo = useCallback((path: string) => {
        if (!path) {
            return;
        }
        const initialized = !!state$.value;
        if (!initialized) {
            path = location.hash.slice(1).replace('!/', '') || path;
        }
        const libraryId = getLibraryId(path);
        if (libraryId && !path.includes('?libraryId=') && getMediaSource(path)) {
            path = `${path}?libraryId=${libraryId}`;
        }
        if (!isSamePath(path, state$.value?.path || '')) {
            logger.log('navigateTo', path);
            const showingWizard = document.body.classList.contains('showing-startup-wizard');
            const key = nanoid();
            const index =
                initialized && !showingWizard ? state$.value.index + 1 : storage.getNumber('index');
            const stack = stack$.value.slice();
            const state: HistoryState = {key, path, index, libraryId};
            const entry = createHistoryEntry(key, path);
            stack[index] = entry;
            stack.length =
                initialized && !showingWizard ? index + 1 : Math.max(stack.length, index + 1);
            if (!showingWizard) {
                const hash = `#!/${path}`;
                if (initialized) {
                    history.pushState(state, '', hash);
                } else {
                    history.replaceState(state, '', hash);
                }
            }
            storage.setNumber('length', stack.length);
            storage.setNumber('index', state.index);
            state$.next(state);
            stack$.next(stack);
        }
    }, []);

    return {
        currentIndex: state?.index ?? -1,
        currentKey: state?.key || '',
        currentPath: state?.path || '',
        stack,
        back,
        expire,
        forward,
        navigateTo,
        refresh,
        switchLibrary,
    };
}

function createHistoryEntry(key: string, path: string): HistoryEntry {
    path = path.replace(/\?.*$/, ''); // Remove query params.
    const service = getServiceFromPath(path);
    const source = path.startsWith('pins/')
        ? createPin(path)
        : (getMediaSource(path) ?? createMediaObjectSource(path));
    if (service && source) {
        return {
            key,
            node: <MediaBrowser service={service} source={source} />,
        };
    } else {
        const error = Error(`Cannot navigate to: ${path}`);
        return {
            key,
            node: (
                <div className="media-browser">
                    <ErrorScreen error={error} reportingId={'useHistory'} />
                </div>
            ),
        };
    }
}

function createMediaObjectSource(path: string): MediaSource<any> | undefined {
    const service = getServiceFromPath(path);
    if (service?.createSourceFromObject) {
        const src = path.replaceAll('/', ':');
        return service.createSourceFromObject(src);
    }
}

function createPin(path: string): MediaSource<Pinnable> | undefined {
    const service = getServiceFromPath(path);
    const src = path.slice(5).replaceAll('/', ':');
    const pin = pinStore.getPin(src);
    return pin ? service?.createSourceFromPin?.(pin) : undefined;
}

function getLibraryId(path: string): string | undefined {
    const [, search] = path.split('?');
    const params = new URLSearchParams(search);
    const libraryId = params.get('libraryId');
    if (libraryId == null) {
        const service = getServiceFromPath(path);
        return service && isPersonalMediaService(service) ? service.libraryId : undefined;
    } else {
        return libraryId;
    }
}

function getMediaSource(path: string): AnyMediaSource | undefined {
    path = path.replace(/\?.*$/, '');
    const service = getServiceFromPath(path);
    return service?.id === path
        ? service.root
        : service?.sources?.find((source) => source.id === path);
}

function isSamePath(a: string, b: string): boolean {
    const [pathA] = a.split('?');
    const [pathB] = b.split('?');
    return pathA === pathB;
}
