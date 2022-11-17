import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
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

export function observeAll(): Observable<readonly string[]> {
    return sources$;
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

function setAll(ids: readonly string[]): void {
    storage.setString('all', String(ids));
    sources$.next(ids);
}

const mediaSources: MediaSources = {
    observeAll,
    getAll,
    getServices,
    setServices,
    getSources,
    setSources,
};

export default mediaSources;
