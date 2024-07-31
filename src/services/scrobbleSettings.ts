import {BehaviorSubject} from 'rxjs';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import {LiteStorage} from 'utils';

export interface ScrobblingOptions {
    updateNowPlaying?: boolean;
}

type BooleanSettings = Record<string, boolean | undefined>;
type NoScrobbleSettings = Record<string, BooleanSettings | undefined>;
type ScrobblingOptionsSettings = Record<string, ScrobblingOptions | undefined>;

const storage = new LiteStorage('scrobbling');
const noScrobble$ = new BehaviorSubject<NoScrobbleSettings>(storage.getJson('noScrobble', {}));
const options$ = new BehaviorSubject<ScrobblingOptionsSettings>(storage.getJson('options', {}));

export function canScrobble(scrobblerId: MediaServiceId, service: MediaService): boolean {
    const settings = noScrobble$.getValue();
    const scrobblerSettings = settings[scrobblerId];
    return !(scrobblerSettings?.[service.id] ?? service.defaultNoScrobble);
}

export function setNoScrobble(scrobblerId: MediaServiceId, updates: Record<string, boolean>): void {
    const settings = noScrobble$.getValue();
    const scrobblerSettings = settings[scrobblerId];
    const newScrobblerSettings = {...scrobblerSettings, ...updates};
    const newSettings = {...settings, ...{[scrobblerId]: newScrobblerSettings}};
    storage.setJson('noScrobble', newSettings);
    noScrobble$.next(newSettings);
}

export function canUpdateNowPlaying(scrobblerId: MediaServiceId): boolean {
    const settings = options$.getValue();
    return !!settings[scrobblerId]?.updateNowPlaying;
}

export function updateOptions(scrobbler: MediaService, options: Partial<ScrobblingOptions>): void {
    const settings = options$.getValue();
    const scrobblerSettings = settings[scrobbler.id];
    const newScrobblerSettings = {...scrobblerSettings, ...options};
    const newSettings = {...settings, ...{[scrobbler.id]: newScrobblerSettings}};
    storage.setJson('options', newSettings);
    options$.next(newSettings);
}

export default {
    canScrobble,
    setNoScrobble,
    canUpdateNowPlaying,
    updateOptions,
};
