import React, {useCallback} from 'react';
import {BehaviorSubject, fromEvent, map} from 'rxjs';
import {nanoid} from 'nanoid';
import MediaObject from 'types/MediaObject';
import MediaSource, {MediaObjectSource} from 'types/MediaSource';
import Pager from 'types/Pager';
import {Pinnable} from 'types/Pin';
import {Logger} from 'utils';
import {WEB_LINKS} from 'services/features';
import {getServiceFromPath, isPersonalMediaService} from 'services/mediaServices';
import pinStore from 'services/pins/pinStore';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import useObservable from 'hooks/useObservable';
import ErrorScreen from './ErrorScreen';
import MediaBrowser from './MediaBrowser';

const logger = new Logger('history');

export interface HistoryEntry {
    readonly key: string;
    readonly node: React.ReactNode;
}

export type HistoryState = {
    readonly key: string;
    readonly path: string;
};

const stack$ = new BehaviorSubject<HistoryEntry[]>([]);
const state$ = new BehaviorSubject<HistoryState | null>(null);

const observeStack = () => stack$;
const observeState = () => state$;

if (WEB_LINKS) {
    fromEvent<PopStateEvent>(window, 'popstate')
        .pipe(map((event) => event.state))
        .subscribe(state$);

    state$.subscribe((state) => {
        if (state) {
            const {key, path} = state;
            const historyItem = stack$.value.find((entry) => entry.key === key);
            if (!historyItem) {
                const entry = createHistoryEntry(key, path);
                stack$.next(stack$.value.concat(entry));
            }
        }
    });
}

export default function useHistory() {
    const stack = useObservable(observeStack, stack$.value);
    const state = useObservable(observeState, state$.value);
    const currentKey = state?.key || '';
    const currentPath = state?.path || '';

    const back = useCallback(() => {
        history.back();
    }, []);

    const forward = useCallback(() => {
        history.forward();
    }, []);

    const refresh = useCallback(() => {
        const state = state$.value;
        if (state) {
            const currentKey = state.key;
            const stack = stack$.value.slice();
            const index = stack.findIndex((entry) => entry.key === currentKey);
            if (index !== -1) {
                const key = nanoid(); // New `key`.
                const path = state.path;
                stack[index] = createHistoryEntry(key, path);
                stack$.next(stack);
                if (WEB_LINKS) {
                    history.replaceState({...state, key}, '', `#!/${path}`);
                }
                state$.next({...state, key});
            }
        }
    }, []);

    const switchLibrary = useCallback((libraryId: string) => {
        const state = state$.value;
        if (state) {
            const currentKey = state.key;
            const stack = stack$.value.slice();
            const index = stack.findIndex((entry) => entry.key === currentKey);
            if (index !== -1) {
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
                stack[index] = createHistoryEntry(key, path);
                stack$.next(stack);
                if (WEB_LINKS) {
                    history.replaceState({...state, key}, '', `#!/${path}`);
                }
                state$.next({...state, key});
            }
        }
    }, []);

    const navigateTo = useCallback((path: string) => {
        if (WEB_LINKS) {
            const service = getServiceFromPath(path);
            const libraryId =
                service && isPersonalMediaService(service) ? service.libraryId : undefined;
            if (libraryId !== undefined) {
                path = `${path}?libraryId=${libraryId}`;
            }
        }
        logger.log('navigateTo', path);
        const key = nanoid();
        const state = {key, path};
        const entry = createHistoryEntry(key, path);
        if (WEB_LINKS) {
            stack$.next(stack$.value.concat(entry));
            if (history.state) {
                history.pushState(state, '', `#!/${path}`);
            } else {
                history.replaceState(state, '', `#!/${path}`);
            }
        } else {
            stack$.next([entry]);
        }
        state$.next(state);
    }, []);

    return {
        currentKey,
        currentPath,
        stack,
        back,
        forward,
        navigateTo,
        refresh,
        switchLibrary,
    };
}

function createHistoryEntry(key: string, path: string): HistoryEntry {
    path = path.replace(/\?.*$/, '');
    const service = getServiceFromPath(path);
    const source = path.startsWith('pins/')
        ? createSourceFromPinsPath(path)
        : service?.id === path
          ? service.root
          : (service?.sources?.find((source) => source.id === path) ?? createSourceFromPath(path));
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

function createSourceFromPath(path: string): MediaObjectSource | undefined {
    const service = getServiceFromPath(path);
    if (service?.getMediaObject) {
        const src = path.replaceAll('/', ':');
        return {
            id: src,
            title: '',
            icon: service.id,
            singular: true,
            search(): Pager<MediaObject> {
                return new SimpleMediaPager(async () => {
                    const object = await service.getMediaObject!(src);
                    return [object];
                });
            },
        };
    }
}

function createSourceFromPinsPath(path: string): MediaSource<Pinnable> | undefined {
    const service = getServiceFromPath(path);
    const src = path.slice(5).replaceAll('/', ':');
    const pin = pinStore.getPin(src);
    return pin ? service?.createSourceFromPin?.(pin) : undefined;
}
