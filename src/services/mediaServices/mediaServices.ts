import type {Observable} from 'rxjs';
import {
    BehaviorSubject,
    distinctUntilChanged,
    filter,
    firstValueFrom,
    map,
    merge,
    mergeMap,
    of,
    race,
    skipWhile,
    switchMap,
    tap,
    timer,
} from 'rxjs';
import DataService from 'types/DataService';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import PersonalMediaService from 'types/PersonalMediaService';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import {loadLibrary, Logger} from 'utils';

const logger = new Logger('mediaServices');

const services$ = new BehaviorSubject<readonly MediaService[]>([]);

export function observeMediaServices(): Observable<readonly MediaService[]> {
    return services$;
}

export function observeEnabledServices(): Observable<readonly MediaService[]> {
    return observeMediaServices().pipe(
        map((services) => services.filter((service) => !service.disabled))
    );
}

export function observeIsLoggedIn(service: MediaService | string): Observable<boolean> {
    const id = typeof service === 'string' ? service : service.id;
    return observeMediaServices().pipe(
        map((services) => services.find((service) => service.id === id)),
        switchMap((service) => (service ? service.observeIsLoggedIn() : of(false))),
        distinctUntilChanged()
    );
}

export async function loadMediaServices(): Promise<readonly MediaService[]> {
    if (getServices().length === 0) {
        await loadLibrary('media-services');
        const {default: services} = await import(
            /* webpackMode: "weak" */
            './all'
        );
        // Don't emit twice.
        if (getServices().length === 0) {
            services$.next(services);
        }
    }
    return getServices();
}

// Available to most users but may be hidden by settings or build configuration.
export function getEnabledServices(): readonly MediaService[] {
    return getServices().filter((service) => !service.disabled);
}

export function observePersonalMediaLibraryIdChanges(): Observable<void> {
    return observeMediaServices().pipe(
        map((services) => services.filter(isPersonalMediaService)),
        map((services) => services.filter((service) => !!service.observeLibraryId)),
        switchMap((services) => merge(...services.map((service) => service.observeLibraryId!()))),
        map(() => undefined)
    );
}

export function canPlayNow<T extends MediaItem>(item: T): boolean {
    const isAlwaysPlayable = /^(blob|file|https?|youtube):/;
    if (isAlwaysPlayable.test(item.src)) {
        return true;
    }
    const service = getServiceFromSrc(item);
    return service?.isLoggedIn() ?? true;
}

export function getDataServices(): readonly DataService[] {
    return getEnabledServices().filter(isDataService);
}

export function getLookupServices(): readonly MediaService[] {
    return getEnabledServices().filter((service) => !!service.lookup);
}

export function getPersonalMediaServices(): readonly PersonalMediaService[] {
    return getEnabledServices().filter(isPersonalMediaService);
}

export function getPlayableServices(): readonly MediaService[] {
    return getServices().filter((service) => !isDataService(service));
}

export function getPublicMediaServices(): readonly PublicMediaService[] {
    return getEnabledServices().filter(isPublicMediaService);
}

export function getScrobblers(): readonly DataService[] {
    return getDataServices().filter((service) => service.canScrobble);
}

export function getService(serviceId: string): MediaService | undefined {
    return getServices().find((service) => service.id === serviceId);
}

export function getServiceFromSrc({src}: {src?: string} = {}): MediaService | undefined {
    const [serviceId] = String(src).split(':');
    return getService(serviceId);
}

export function hasPlayableSrc(item: {src: string}): boolean {
    return item ? isPlayableSrc(item.src) : false;
}

export function isDataService(service: MediaService): service is DataService {
    return isMediaServiceType(service, ServiceType.DataService);
}

export function isPersonalMediaService(service: MediaService): service is PersonalMediaService {
    return isMediaServiceType(service, ServiceType.PersonalMedia);
}

export function isPlayableSrc(src: string): boolean {
    if (src) {
        const [serviceId] = String(src).split(':');
        const service = getService(serviceId);
        return service
            ? service.serviceType !== ServiceType.DataService
            : serviceId !== 'musicbrainz';
    } else {
        return false;
    }
}

export function isPublicMediaService(service: MediaService): service is PublicMediaService {
    return isMediaServiceType(service, ServiceType.PublicMedia);
}

export function isScrobbler(service: MediaService): boolean {
    return isDataService(service) && !!service.canScrobble;
}

export async function waitForLogin(
    service: MediaService | string,
    timeout: number
): Promise<boolean> {
    if (timeout) {
        const isLoggedIn$ = observeMediaServices().pipe(
            skipWhile((services) => services.length === 0),
            map(() => (typeof service === 'string' ? getService(service) : service)),
            switchMap((service) => (service ? service.observeIsLoggedIn() : of(true))),
            filter((isLoggedIn) => isLoggedIn)
        );
        const timeout$ = timer(timeout).pipe(map(() => false));
        const isLoggedIn = await firstValueFrom(race(isLoggedIn$, timeout$));
        return isLoggedIn;
    } else {
        const mediaService = typeof service === 'string' ? getService(service) : service;
        return mediaService?.isLoggedIn() ?? true;
    }
}

function getServices(): readonly MediaService[] {
    return services$.value;
}

function isMediaService(service: any): service is MediaService {
    return service ? 'serviceType' in service : false;
}

function isMediaServiceType(service: MediaService, type: ServiceType): boolean {
    return isMediaService(service) && service.serviceType === type;
}

// Connectivity logging.
observeMediaServices()
    .pipe(
        switchMap((services) => services),
        mergeMap((service) =>
            service.observeIsLoggedIn().pipe(
                skipWhile((isLoggedIn) => !isLoggedIn),
                tap((isLoggedIn) => logger.log(`${service.id} ${isLoggedIn ? '' : 'dis'}connected`))
            )
        )
    )
    .subscribe(logger);
