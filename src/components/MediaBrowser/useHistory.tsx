import React, {useCallback} from 'react';
import {BehaviorSubject, fromEvent, map} from 'rxjs';
import {nanoid} from 'nanoid';
import MediaSource, {AnyMediaSource} from 'types/MediaSource';
import {Pinnable} from 'types/Pin';
import {LiteStorage, Logger} from 'utils';
import {WEB_LINKS} from 'services/features';
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
};

const MAX_SIZE = 50;

const logger = new Logger('history');

const storage = new LiteStorage('history', 'session');

const stack$ = new BehaviorSubject<HistoryEntry[]>(Array(storage.getNumber('length')));
const state$ = new BehaviorSubject<HistoryState | null>(null);

const observeStack = () => stack$;
const observeState = () => state$;

if (WEB_LINKS) {
    fromEvent<PopStateEvent>(window, 'popstate')
        .pipe(map((event) => event.state))
        .subscribe(state$);

    state$.subscribe((state) => {
        if (state) {
            const {key, path, index} = state;
            const stack = stack$.value.slice();
            let stackChanged = false;
            let expiredIndex = index - MAX_SIZE;
            while (expiredIndex >= 0) {
                delete stack[expiredIndex];
                stackChanged = true;
                expiredIndex--;
            }
            const historyItem = stack.find((entry) => entry?.key === key);
            if (!historyItem) {
                const entry = createHistoryEntry(key, path);
                stack[index] = entry;
                stackChanged = true;
            }
            if (stackChanged) {
                stack$.next(stack);
            }
            storage.setNumber('index', index);
        }
    });
}

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
            stack$.next(stack);
            if (WEB_LINKS) {
                history.replaceState({...state, key}, '', `#!/${path}`);
            }
            state$.next({...state, key});
        }
    }, []);

    const switchLibrary = useCallback((libraryId: string) => {
        const state = state$.value;
        if (state && getMediaSource(state.path)) {
            const stack = stack$.value.slice();
            const key = nanoid(); // New `key`.
            const [pathname, search] = state.path.split('?');
            let path = pathname;
            if (search) {
                const params = new URLSearchParams(search);
                if (params.has('libraryId')) {
                    params.set('libraryId', libraryId);
                }
                path = `${pathname}?${params}`;
            }
            stack[state.index] = createHistoryEntry(key, path);
            stack$.next(stack);
            if (WEB_LINKS) {
                history.replaceState({...state, key}, '', `#!/${path}`);
            }
            state$.next({...state, key});
        }
    }, []);

    const navigateTo = useCallback((path: string) => {
        if (!path) {
            return;
        }
        if (WEB_LINKS && getMediaSource(path)) {
            const service = getServiceFromPath(path);
            const libraryId =
                service && isPersonalMediaService(service) ? service.libraryId : undefined;
            if (libraryId !== undefined) {
                path = `${path}?libraryId=${libraryId}`;
            }
        }
        const initialized = !!state$.value;
        if (WEB_LINKS && !initialized) {
            path = location.hash.slice(3) || path;
        }
        if (path !== state$.value?.path) {
            logger.log('navigateTo', path);
            const key = nanoid();
            const index = WEB_LINKS
                ? initialized
                    ? state$.value.index + 1
                    : storage.getNumber('index')
                : 0;
            const stack = stack$.value.slice();
            const state: HistoryState = {key, path, index};
            const entry = createHistoryEntry(key, path);
            stack[index] = entry;
            stack.length = WEB_LINKS
                ? initialized
                    ? index + 1
                    : Math.max(stack.length, index + 1)
                : 1;
            stack$.next(stack);
            if (WEB_LINKS) {
                const hash = `#!/${path}`;
                if (initialized) {
                    history.pushState(state, '', hash);
                } else {
                    history.replaceState(state, '', hash);
                }
            }
            state$.next(state);
            storage.setNumber('length', stack.length);
            storage.setNumber('index', state.index);
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
        return {
            key,
            node: (
                <div className="media-browser">
                    <ErrorScreen error={'Internal error'} reportingId={'useHistory'} />
                </div>
            ),
        };
    }
}

function getMediaSource(path: string): AnyMediaSource | undefined {
    path = path.replace(/\?.*$/, '');
    const service = getServiceFromPath(path);
    return service?.id === path
        ? service.root
        : service?.sources?.find((source) => source.id === path);
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
