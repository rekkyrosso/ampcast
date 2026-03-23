import React, {useCallback, useId} from 'react';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import {getService, getServiceFromSrc} from 'services/mediaServices';
import {isSourceVisible} from 'services/mediaServices/servicesSettings';
import {
    canScrobbleRadio,
    canScrobbleService,
    getNoScrobbleTrack,
    setNoScrobbleRadio,
    setNoScrobbleTrack,
} from 'services/scrobbleSettings';

export interface ScrobblingOptionsProps<T extends MediaItem> {
    item: T;
}

export default function ScrobblingOptions<T extends MediaItem>({item}: ScrobblingOptionsProps<T>) {
    const lastfm = getService('lastfm');
    const listenbrainz = getService('listenbrainz');
    return (lastfm && isSourceVisible(lastfm)) ||
        (listenbrainz && isSourceVisible(listenbrainz)) ? (
        <p className="scrobbling-options">
            {getNoScrobbleReason(item) || <ScrobblingOptionsInput item={item} />}
        </p>
    ) : null;
}

function ScrobblingOptionsInput<T extends MediaItem>({item}: {item: T}) {
    const id = useId();
    const isStation = item.linearType === LinearType.Station;

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const noScrobble = event.target.checked;
            if (item.linearType === LinearType.Station) {
                setNoScrobbleRadio(item.src, noScrobble);
            } else {
                setNoScrobbleTrack(item.src, noScrobble);
            }
        },
        [item]
    );

    return (
        <>
            <input
                id={`${id}-no-scrobble`}
                type="checkbox"
                defaultChecked={
                    isStation ? !canScrobbleRadio(item.src) : getNoScrobbleTrack(item.src)
                }
                onChange={handleChange}
            />
            <label htmlFor={`${id}-no-scrobble`}>
                Don&apos;t scrobble {isStation ? 'tracks from this station' : 'this track'}
            </label>
        </>
    );
}

function getNoScrobbleReason<T extends MediaItem>(item: T): string {
    const lastfm = getService('lastfm');
    const listenbrainz = getService('listenbrainz');
    const internetRadio = getService('internet-radio');
    let service = getServiceFromSrc(item);
    if (!service && item.linearType) {
        if (item.linearType === LinearType.Station) {
            if (item.src.startsWith('http')) {
                service = internetRadio;
            }
        } else if (item.stationSrc?.startsWith('http')) {
            service = internetRadio;
        }
    }
    if (service) {
        if (lastfm && isSourceVisible(lastfm)) {
            if (listenbrainz && isSourceVisible(listenbrainz)) {
                if (
                    !canScrobbleService(lastfm.id, service) &&
                    !canScrobbleService(listenbrainz.id, service)
                ) {
                    return `Scrobbling is disabled for ${service.name}`;
                }
            } else if (!canScrobbleService(lastfm.id, service)) {
                return `${lastfm.name} scrobbling is disabled for ${service.name}`;
            }
        } else if (
            listenbrainz &&
            isSourceVisible(listenbrainz) &&
            !canScrobbleService(listenbrainz.id, service)
        ) {
            return `${listenbrainz.name} scrobbling is disabled for ${service.name}`;
        }
    }
    if (item.linearType) {
        if (item.linearType === LinearType.Station) {
            return '';
        }
        if (item.linearType !== LinearType.MusicTrack) {
            return `This item cannot be scrobbled`;
        }
        if (item.stationSrc && !canScrobbleRadio(item.stationSrc)) {
            return 'Scrobbling is disabled for this radio station';
        }
    }
    if (!item.title || !item.artists?.[0]) {
        return 'Not enough metadata to scrobble this track';
    }
    if (item.duration && item.duration < 30) {
        return 'This track is too short to be scrobbled';
    }
    return '';
}
