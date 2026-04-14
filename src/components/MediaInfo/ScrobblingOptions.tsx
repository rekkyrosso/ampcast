import React, {useCallback, useId, useState} from 'react';
import LinearType from 'types/LinearType';
import PlaylistItem from 'types/PlaylistItem';
import {getService, getServiceFromSrc} from 'services/mediaServices';
import {isScrobblingEnabled, isSourceVisible} from 'services/mediaServices/servicesSettings';
import {
    canScrobbleRadio,
    canScrobbleService,
    getNoScrobbleTrack,
    getScrobbleData,
    setNoScrobbleRadio,
    setNoScrobbleTrack,
} from 'services/scrobbleSettings';
import Button from 'components/Button';
import {showEditScrobbleDataDialog} from './EditScrobbleDataDialog';

export interface ScrobblingOptionsProps<T extends PlaylistItem> {
    item: T;
}

export default function ScrobblingOptions<T extends PlaylistItem>({
    item,
}: ScrobblingOptionsProps<T>) {
    const canScrobble = isScrobblingEnabled();
    const noScrobbleReason = canScrobble ? getNoScrobbleReason(item) : '';
    return canScrobble ? (
        noScrobbleReason ? (
            <p className="scrobbling-options">{noScrobbleReason}</p>
        ) : item.linearType === LinearType.Station ? (
            <RadioScrobblingOptions station={item} />
        ) : (
            <TrackScrobblingOptions track={item} />
        )
    ) : null;
}

function RadioScrobblingOptions<T extends PlaylistItem>({station}: {station: T}) {
    const id = useId();

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const noScrobble = event.target.checked;
            setNoScrobbleRadio(station.src, noScrobble);
        },
        [station]
    );

    return (
        <p className="scrobbling-options">
            <input
                id={`${id}-no-scrobble`}
                type="checkbox"
                defaultChecked={!canScrobbleRadio(station.src)}
                onChange={handleChange}
            />
            <label htmlFor={`${id}-no-scrobble`}>
                Don&apos;t scrobble tracks from this station
            </label>
        </p>
    );
}

function TrackScrobblingOptions<T extends PlaylistItem>({track}: {track: T}) {
    const id = useId();
    const {title, artist} = getScrobbleData(track);
    const [scrobblingDisabled, setScrobblingDisabled] = useState(() =>
        getNoScrobbleTrack(track.src)
    );

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const noScrobble = event.target.checked;
            setNoScrobbleTrack(track.src, noScrobble);
            setScrobblingDisabled(noScrobble);
        },
        [track]
    );

    const editScrobbleData = useCallback(() => {
        showEditScrobbleDataDialog(track);
    }, [track]);

    return (
        <p className="scrobbling-options">
            {title && artist ? (
                <>
                    <input
                        id={`${id}-no-scrobble`}
                        type="checkbox"
                        defaultChecked={getNoScrobbleTrack(track.src)}
                        onChange={handleChange}
                    />
                    <label htmlFor={`${id}-no-scrobble`}>Don&apos;t scrobble this track</label>
                </>
            ) : (
                'Not enough metadata to scrobble this track'
            )}
            <Button
                type="button"
                className="small"
                disabled={scrobblingDisabled}
                onClick={editScrobbleData}
            >
                Scrobble as…
            </Button>
        </p>
    );
}

function getNoScrobbleReason<T extends PlaylistItem>(item: T): string {
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
            return 'This item cannot be scrobbled';
        }
        if (item.stationSrc && !canScrobbleRadio(item.stationSrc)) {
            return 'Scrobbling is disabled for this radio station';
        }
    }
    const duration = item.duration;
    if (duration && duration < 30) {
        return 'This track is too short to be scrobbled';
    }
    return '';
}
