import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map} from 'rxjs';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import ScrobbleData from 'types/ScrobbleData';
import {LiteStorage, uniq} from 'utils';
import {getService, getServiceFromSrc} from 'services/mediaServices';

export interface ScrobblingOptions {
    scrobbledAt: 'playedAt' | 'endedAt';
    updateNowPlaying: boolean;
}

type BooleanSettings = Record<string, boolean | undefined>;
type NoScrobbleSettings = Record<string, BooleanSettings | undefined>;
type ScrobblingOptionsSettings = Record<string, ScrobblingOptions | undefined>;

const storage = new LiteStorage('scrobbling');
const noScrobble$ = new BehaviorSubject<NoScrobbleSettings>(storage.getJson('noScrobble', {}));
const options$ = new BehaviorSubject<ScrobblingOptionsSettings>(storage.getJson('options', {}));

export function canScrobbleRadio(src: string): boolean {
    const srcs = storage.getJson<string[]>('noScrobbleRadios', []);
    return !srcs.includes(src);
}

export function canScrobbleService(scrobblerId: MediaServiceId, service: MediaService): boolean {
    const settings = noScrobble$.value;
    const scrobblerSettings = settings[scrobblerId];
    return !(scrobblerSettings?.[service.id] ?? service.defaultNoScrobble);
}

export function canScrobbleTrack(scrobblerId: MediaServiceId, item: MediaItem | null): boolean {
    if (!item) {
        return false;
    }
    const {title, artist} = getScrobbleData(item);
    const duration = item.duration;
    if (!title || !artist || (duration && duration < 30)) {
        // Basic last.fm/ListenBrainz scrobbling rules.
        return false;
    }
    const service = getServiceFromSrc(item);
    if (service && !canScrobbleService(scrobblerId, service)) {
        // Scrobbling is disabled for this media service.
        return false;
    }
    if (item.linearType) {
        if (item.linearType !== LinearType.MusicTrack) {
            // This is a radio station/show/ad and can't be scrobbled.
            return false;
        }
        if (item.stationSrc) {
            if (item.stationSrc.startsWith('http')) {
                const internetRadio = getService('internet-radio');
                if (internetRadio && !canScrobbleService(scrobblerId, internetRadio)) {
                    // Scrobbling of any internet radio is disabled.
                    return false;
                }
            }
            if (!canScrobbleRadio(item.stationSrc)) {
                // Scrobbling of this radio station is disabled.
                return false;
            }
        }
    }
    return !getNoScrobbleTrack(item.src);
}

export function getScrobbleData(item: MediaItem): ScrobbleData {
    const scrobbleAs = item.scrobbleAs;
    const title = scrobbleAs?.title || item.title;
    const artist = scrobbleAs?.artist || item.artists?.[0] || '';
    const album = scrobbleAs?.album || item.album;
    return {title, artist, album};
}

export function setNoScrobbleService(
    scrobblerId: MediaServiceId,
    updates: Record<string, boolean>
): void {
    const settings = noScrobble$.value;
    const scrobblerSettings = settings[scrobblerId];
    const newScrobblerSettings = {...scrobblerSettings, ...updates};
    const newSettings = {...settings, ...{[scrobblerId]: newScrobblerSettings}};
    storage.setJson('noScrobble', newSettings);
    noScrobble$.next(newSettings);
}

export function setNoScrobbleRadio(src: string, noScrobble: boolean): void {
    const prevSrcs = storage.getJson<string[]>('noScrobbleRadios', []);
    const nextSrcs = noScrobble
        ? uniq(prevSrcs.concat(src))
        : prevSrcs.filter((prevSrc) => prevSrc !== src);
    storage.setJson('noScrobbleRadios', nextSrcs);
}

export function getNoScrobbleTrack(src: string): boolean {
    const srcs = storage.getJson<string[]>('noScrobbleTracks', []);
    return srcs.includes(src);
}

export function setNoScrobbleTrack(src: string, noScrobble: boolean): void {
    const prevSrcs = storage.getJson<string[]>('noScrobbleTracks', []);
    const nextSrcs = noScrobble
        ? uniq(prevSrcs.concat(src))
        : prevSrcs.filter((prevSrc) => prevSrc !== src);
    storage.setJson('noScrobbleTracks', nextSrcs);
}

export function getNoScrobbleTracks(): readonly string[] {
    return storage.getJson('noScrobbleTracks', []);
}

export function setNoScrobbleTracks(srcs: readonly string[]): void {
    storage.setJson('noScrobbleTracks', srcs);
}

export function canUpdateNowPlaying(scrobblerId: MediaServiceId): boolean {
    const settings = options$.value;
    return settings[scrobblerId]?.updateNowPlaying ?? true;
}

export function observeCanUpdateNowPlaying(scrobblerId: MediaServiceId): Observable<boolean> {
    return options$.pipe(
        map((options) => options[scrobblerId]?.updateNowPlaying ?? true),
        distinctUntilChanged()
    );
}

export function getScrobbledAt(scrobblerId: MediaServiceId): ScrobblingOptions['scrobbledAt'] {
    const settings = options$.value;
    return settings[scrobblerId]?.scrobbledAt ?? 'playedAt';
}

export function updateScrobblingOptions(
    scrobbler: MediaService,
    options: Partial<ScrobblingOptions>
): void {
    const settings = options$.value;
    const scrobblerSettings = settings[scrobbler.id];
    const newScrobblerSettings = {...scrobblerSettings, ...options};
    const newSettings = {...settings, ...{[scrobbler.id]: newScrobblerSettings}};
    storage.setJson('options', newSettings);
    options$.next(newSettings);
}
