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
    take,
    tap,
    timer,
} from 'rxjs';
import Browsable from 'types/Browsable';
import DataService from 'types/DataService';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import PersonalMediaService from 'types/PersonalMediaService';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import {loadLibrary, Logger} from 'utils';
import {isServiceDisabled} from 'services/buildConfig';
import {isSourceVisible, observeSourceVisibility} from './servicesSettings';

const logger = new Logger('mediaServices');

const services$ = new BehaviorSubject<readonly MediaService[]>([]);

const playabilityByServiceId: Record<
    MediaServiceId | 'blob' | 'file' | 'http' | 'https',
    boolean | undefined
> = {
    // Always playable.
    blob: true,
    file: true,
    http: true,
    https: true,
    mixcloud: true,
    soundcloud: true,
    youtube: true,
    // Playable if logged in.
    airsonic: false,
    ampache: false,
    apple: false,
    emby: false,
    gonic: false,
    jellyfin: false,
    navidrome: false,
    plex: false,
    spotify: false,
    subsonic: false,
    tidal: false,
    // Not playable.
    lastfm: undefined,
    listenbrainz: undefined,
};

export function observeMediaServices(): Observable<readonly MediaService[]> {
    return services$;
}

export function observeEnabledServices(): Observable<readonly MediaService[]> {
    return observeMediaServices().pipe(
        map((services) => services.filter((service) => !isServiceDisabled(service)))
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

export function getServices(): readonly MediaService[] {
    return services$.value;
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
export function getBrowsableServices(): readonly Browsable<MediaService>[];
export function getBrowsableServices<T extends MediaService>(
    serviceType: T['serviceType']
): readonly Browsable<T>[];
export function getBrowsableServices<T extends MediaService = MediaService>(
    serviceType?: T['serviceType']
): readonly Browsable<T>[] {
    return getEnabledServices()
        .filter((service): service is Browsable<T> => !!service.root)
        .filter((service) =>
            serviceType === undefined ? true : service.serviceType === serviceType
        );
}

// Available to most users but may be hidden by settings or build configuration.
export function getEnabledServices(): readonly MediaService[] {
    return getServices().filter((service) => !isServiceDisabled(service));
}

export function observePersonalMediaLibraryIdChanges(): Observable<void> {
    return observeMediaServices().pipe(
        map((services) => services.filter(isPersonalMediaService)),
        map((services) => services.filter((service) => !!service.observeLibraryId)),
        switchMap((services) => merge(...services.map((service) => service.observeLibraryId!()))),
        map(() => undefined)
    );
}

export function getDataServices(): readonly DataService[] {
    return getEnabledServices().filter(isDataService);
}

export function getMediaLookupServices(): readonly MediaService[] {
    return getEnabledServices().filter(
        (service) => service.serviceType !== ServiceType.DataService && !!service.lookup
    );
}

export function getPersonalMediaServices(): readonly PersonalMediaService[] {
    return getEnabledServices().filter(isPersonalMediaService);
}

export function getPlayableServices(): readonly MediaService[] {
    return getEnabledServices().filter((service) => !isDataService(service));
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

export function isPlayableSrc(src: string, immediate?: boolean): boolean {
    if (src) {
        const [serviceId, type, id] = String(src).split(':');
        const playability = playabilityByServiceId[serviceId as MediaServiceId];
        const notPlayable = playability === undefined;
        const playableNow = playability === true;
        if (notPlayable) {
            return false;
        }
        if (playableNow) {
            return /^(blob|file|https?)$/.test(serviceId) ? true : !!(type && id);
        }
        // Playable service.
        if (type && id) {
            if (!immediate) {
                return true;
            }
            const service = getService(serviceId);
            return !!service && service.isLoggedIn();
        }
    }
    return false;
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

function isMediaService(service: any): service is MediaService {
    return service ? 'serviceType' in service : false;
}

function isMediaServiceType(service: MediaService, type: ServiceType): boolean {
    return isMediaService(service) && service.serviceType === type;
}

// Reconnect on startup.
observeEnabledServices()
    .pipe(
        skipWhile((services) => services.length === 0),
        take(1),
        mergeMap((services) => services),
        filter(
            (service) =>
                isSourceVisible(service) && !isServiceDisabled(service) && service.isConnected()
        ),
        // It's better not to do this async.
        tap((service) => service.reconnect?.())
    )
    .subscribe(logger);

// Disconnect services when they are hidden.
observeMediaServices()
    .pipe(
        switchMap((services) => services),
        mergeMap((service) =>
            observeSourceVisibility(service).pipe(
                tap((visible) => {
                    if (service.isConnected() && !visible) {
                        service.logout();
                    }
                })
            )
        )
    )
    .subscribe(logger);

// Disconnect services if they are disabled (docker mainly).
observeMediaServices()
    .pipe(
        skipWhile((services) => services.length === 0),
        take(1),
        mergeMap((services) => services),
        filter((service) => isServiceDisabled(service) && service.isConnected()),
        tap((service) => service.logout())
    )
    .subscribe(logger);

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
