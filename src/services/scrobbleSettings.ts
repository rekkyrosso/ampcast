import type {Observable} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaServiceId, {ScrobblerId} from 'types/MediaServiceId';
import NoScrobbleReason from 'types/NoScrobbleReason';
import {LiteStorage, uniq} from 'utils';
import {getService, getServiceFromSrc} from 'services/mediaServices';
import {
    isScrobblingEnabled,
    isServiceVisible,
    isSourceVisible,
} from 'services/mediaServices/servicesSettings';

export interface ScrobblerOptions {
    scrobbledAt: 'playedAt' | 'endedAt';
    updateNowPlaying: boolean;
}

type NoScrobbleSettings = Record<
    ScrobblerId,
    Record<MediaServiceId, boolean | undefined> | undefined
>;
type ScrobblerOptionsSettings = Record<ScrobblerId, ScrobblerOptions | undefined>;

const storage = new LiteStorage('scrobbling');

export function observeScrobbleSettingsChange(): Observable<void> {
    return storage.observeChange();
}

export function canScrobbleRadio(src: string): boolean {
    const srcs = storage.getJson<string[]>('noScrobbleRadios', []);
    return !srcs.includes(src);
}

export function canScrobbleService(scrobblerId: ScrobblerId, service: MediaService): boolean {
    const settings = storage.getJson<NoScrobbleSettings>('noScrobble', {} as NoScrobbleSettings);
    const scrobblerSettings = settings[scrobblerId];
    // Why do we need to cast `service.id` to `MediaServiceId`?
    return !(scrobblerSettings?.[service.id as MediaServiceId] ?? service.defaultNoScrobble);
}

export function canScrobbleTrack(scrobblerId: ScrobblerId, item: MediaItem | null): boolean {
    return item ? getNoScrobbleReason(item, scrobblerId) === NoScrobbleReason.None : false;
}

export function getScrobbleAs(item: MediaItem): NonNullable<MediaItem['scrobbleAs']> {
    const scrobbleAs = item.scrobbleAs;
    const title = scrobbleAs?.title || item.title;
    const artist = scrobbleAs?.artist || item.artists?.[0] || '';
    const album = scrobbleAs?.album || item.album;
    return {title, artist, album};
}

export function setNoScrobbleService(
    scrobblerId: ScrobblerId,
    updates: Record<string, boolean>
): void {
    const settings = storage.getJson<NoScrobbleSettings>('noScrobble', {} as NoScrobbleSettings);
    const scrobblerSettings = settings[scrobblerId];
    const newScrobblerSettings = {...scrobblerSettings, ...updates};
    const newSettings = {...settings, ...{[scrobblerId]: newScrobblerSettings}};
    storage.setJson('noScrobble', newSettings);
}

export function setNoScrobbleRadio(src: string, noScrobble: boolean): void {
    const prevSrcs = storage.getJson<string[]>('noScrobbleRadios', []);
    const nextSrcs = noScrobble
        ? uniq(prevSrcs.concat(src))
        : prevSrcs.filter((prevSrc) => prevSrc !== src);
    storage.setJson('noScrobbleRadios', nextSrcs);
}

export function canUpdateNowPlaying(scrobblerId: ScrobblerId): boolean {
    const settings = storage.getJson('options', {} as ScrobblerOptionsSettings);
    return settings[scrobblerId]?.updateNowPlaying ?? true;
}

export function observeCanUpdateNowPlaying(scrobblerId: ScrobblerId): Observable<boolean> {
    return observeScrobbleSettingsChange().pipe(
        map(() => storage.getJson('options', {} as ScrobblerOptionsSettings)),
        map((options) => options[scrobblerId]?.updateNowPlaying ?? true),
        distinctUntilChanged()
    );
}

export function getScrobbledAt(scrobblerId: ScrobblerId): ScrobblerOptions['scrobbledAt'] {
    const settings = storage.getJson('options', {} as ScrobblerOptionsSettings);
    return settings[scrobblerId]?.scrobbledAt ?? 'playedAt';
}

export function updateScrobblingOptions(
    scrobblerId: ScrobblerId,
    options: Partial<ScrobblerOptions>
): void {
    const settings = storage.getJson('options', {} as ScrobblerOptionsSettings);
    const scrobblerSettings = settings[scrobblerId];
    const newScrobblerSettings = {...scrobblerSettings, ...options};
    const newSettings = {...settings, ...{[scrobblerId]: newScrobblerSettings}};
    storage.setJson('options', newSettings);
}

export function getNoScrobbleReason<T extends MediaItem>(
    item: T,
    scrobblerId?: ScrobblerId
): NoScrobbleReason {
    if (!isScrobblingEnabled()) {
        return NoScrobbleReason.ScrobblingDisabled;
    }
    if (scrobblerId && !isServiceVisible(scrobblerId)) {
        return NoScrobbleReason.ScrobblingDisabled;
    }
    // Return the least fixable ones first.
    const duration = item.duration;
    if (duration && duration < 30) {
        return NoScrobbleReason.TooShort;
    }
    if (
        item.linearType &&
        item.linearType !== LinearType.MusicTrack &&
        item.linearType !== LinearType.Show
    ) {
        return NoScrobbleReason.InvalidType;
    }
    if (item.scrobbleOverride !== 'scrobble') {
        const service = getItemService(item);
        if (service) {
            if (scrobblerId) {
                if (!canScrobbleService(scrobblerId, service)) {
                    return NoScrobbleReason.DisabledByService;
                }
            } else {
                const lastfm = getService('lastfm');
                const listenbrainz = getService('listenbrainz');
                if (lastfm && isSourceVisible(lastfm)) {
                    if (listenbrainz && isSourceVisible(listenbrainz)) {
                        if (
                            !canScrobbleService(lastfm.id, service) &&
                            !canScrobbleService(listenbrainz.id, service)
                        ) {
                            return NoScrobbleReason.DisabledByService;
                        }
                    } else if (!canScrobbleService(lastfm.id, service)) {
                        return NoScrobbleReason.DisabledByService;
                    }
                } else if (
                    listenbrainz &&
                    isSourceVisible(listenbrainz) &&
                    !canScrobbleService(listenbrainz.id, service)
                ) {
                    return NoScrobbleReason.DisabledByService;
                }
            }
        }
        if (item.linearType && item.stationSrc && !canScrobbleRadio(item.stationSrc)) {
            return NoScrobbleReason.DisabledByStation;
        }
    }
    const {title, artist} = getScrobbleAs(item);
    if (!title || !artist) {
        return NoScrobbleReason.NotEnoughMetadata;
    }
    if (item.linearType === LinearType.Show) {
        return NoScrobbleReason.MetadataNotVerified;
    }
    if (item.scrobbleOverride === 'no-scrobble') {
        return NoScrobbleReason.DisabledByTrack;
    }
    return NoScrobbleReason.None;
}

export function getNoScrobbleReasonText<T extends MediaItem>(
    reason: NoScrobbleReason,
    item: T
): string {
    const service = getItemService(item);
    switch (reason) {
        case NoScrobbleReason.None:
            return '';

        case NoScrobbleReason.ScrobblingDisabled:
            return 'Scrobbling is disabled';

        case NoScrobbleReason.TooShort:
            return 'This track is too short to be scrobbled';

        case NoScrobbleReason.TooLong:
            return 'This track is too long to be scrobbled';

        case NoScrobbleReason.InvalidType:
            return 'This item cannot be scrobbled';

        case NoScrobbleReason.NotEnoughMetadata:
            return 'Not enough metadata to scrobble this track';

        case NoScrobbleReason.MetadataNotVerified:
            return 'This track could not be verified';

        case NoScrobbleReason.DisabledByService:
            return service
                ? `Scrobbling is disabled for ${service.name}`
                : 'Scrobbling is disabled';

        case NoScrobbleReason.DisabledByStation:
            return item.stationName
                ? `Scrobbling is disabled for '${item.stationName}'`
                : 'Scrobbling is disabled for this station';

        case NoScrobbleReason.DisabledByTrack:
            return 'Scrobbling is disabled for this track';
    }
}

function getItemService(item: MediaItem): MediaService | undefined {
    let service = getServiceFromSrc(item);
    if (!service && item.linearType) {
        if (item.linearType === LinearType.Station) {
            if (item.src.startsWith('http')) {
                service = getService('internet-radio');
            }
        } else if (item.stationSrc?.startsWith('http')) {
            service = getService('internet-radio');
        }
    }
    return service;
}
