import type {Observable} from 'rxjs';

export default interface MediaSources {
    observeAll(): Observable<readonly string[]>;
    observeSelected(): Observable<string>;
    getAll(): readonly string[];
    getServices(): readonly string[];
    setServices(ids: readonly string[]): void;
    getSources(serviceId: string): readonly string[];
    setSources(serviceId: string, ids: readonly string[]): void;
    select(id: string): void;
}
