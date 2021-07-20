import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import MediaSources from 'types/MediaSources';
import {LiteStorage} from 'utils';
import mediaServices from './mediaServices';

export const storage = new LiteStorage('sources');

const defaultSources = mediaServices.reduce<string[]>((sources, service) => {
    sources.push(service.id, ...service.sources.map((source) => source.id));
    return sources;
}, []);

const sources$ = new BehaviorSubject<readonly string[]>(
    storage.getItem('all')?.split(',') || defaultSources
);
const selectedId$ = new BehaviorSubject<string>(storage.getItem('selectedId') || defaultSources[0]);

export function observeAll(): Observable<readonly string[]> {
    return sources$;
}

export function observeSelected(): Observable<string> {
    return selectedId$;
}

export function getAll(): readonly string[] {
    return sources$.getValue();
}

export function getServices(): readonly string[] {
    const services = getAllServices();
    return getAll().filter((source) => services.includes(source));
}

export function setServices(ids: readonly string[]): void {
    const all = new Set(getAll());
    const services = getAllServices();
    services.forEach((id) => {
        if (ids.includes(id)) {
            all.add(id);
        } else {
            all.delete(id);
        }
    });
    setAll([...all]);
}

export function getSources(serviceId: string): readonly string[] {
    return getAll().filter((id) => id.startsWith(`${serviceId}/`));
}

export function setSources(serviceId: string, ids: readonly string[]): void {
    const all = new Set(getAll());
    const sources = getAllSources(serviceId);
    sources.forEach((id) => {
        if (ids.includes(id)) {
            all.add(id);
        } else {
            all.delete(id);
        }
    });
    setAll([...all]);
}

export function select(id: string): void;
export function select<T extends MediaObject>(source: MediaSource<T>): void;
export function select<T extends MediaObject>(id: string | MediaSource<T>): void {
    if (typeof id !== 'string') {
        id = id?.id || '';
    }
    selectedId$.next(id);
}

function getAllServices(): readonly string[] {
    return mediaServices.map((service) => service.id);
}

function getAllSources(serviceId: string): readonly string[] {
    return (
        mediaServices
            .find((service) => service.id === serviceId)
            ?.sources.map((source) => source.id) || []
    );
}

function getSelectedId(): string {
    return selectedId$.getValue();
}

function setAll(ids: readonly string[]): void {
    const selectedId = getSelectedId();
    storage.setItem('all', String(ids));
    sources$.next(ids);
    if (!ids.includes(selectedId)) {
        select(defaultSources[0]);
    }
}

observeSelected().subscribe((id) => storage.setItem('selectedId', id));

const mediaSources: MediaSources = {
    observeAll,
    observeSelected,
    getAll,
    getServices,
    setServices,
    getSources,
    setSources,
    select,
};

export default mediaSources;
