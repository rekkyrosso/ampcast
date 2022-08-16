import type {Observable} from 'rxjs';

export default interface MediaSources {
    observeAll(): Observable<readonly string[]>;
    getAll(): readonly string[];
    getServices(): readonly string[];
    setServices(ids: readonly string[]): void;
    getSources(serviceId: string): readonly string[];
    setSources(serviceId: string, ids: readonly string[]): void;
}
