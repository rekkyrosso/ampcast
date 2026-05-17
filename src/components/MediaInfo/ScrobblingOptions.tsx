import React, {useCallback, useId} from 'react';
import LinearType from 'types/LinearType';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import NoScrobbleReason from 'types/NoScrobbleReason';
import PlaylistItem from 'types/PlaylistItem';
import {ScrobblerId} from 'types/MediaServiceId';
import ScrobbleData from 'types/ScrobbleData';
import {cancelEvent, isMiniPlayer} from 'utils';
import {isListen, updateListens} from 'services/localdb/listens';
import {playback, miniPlayer, miniPlayerRemote} from 'services/mediaPlayback';
import {dispatchMetadataChanges} from 'services/metadata';
import {
    canScrobbleRadio,
    getNoScrobbleReason,
    getNoScrobbleReasonText,
    setNoScrobbleRadio,
} from 'services/scrobbleSettings';
import Button from 'components/Button';
import {showScrobbleAsDialog} from './ScrobbleAsDialog';
import './ScrobblingOptions.scss';

export interface ScrobblingOptionsProps<T extends MediaItem> {
    item: T;
    scrobblerId?: ScrobblerId;
}

export default function ScrobblingOptions<T extends MediaItem>({
    item,
    scrobblerId,
}: ScrobblingOptionsProps<T>) {
    const noScrobbleReason = getNoScrobbleReason(item, scrobblerId);
    return isListen(item) ? (
        <ListenScrobblingOptions
            listen={item}
            noScrobbleReason={noScrobbleReason}
            scrobblerId={scrobblerId}
        />
    ) : noScrobbleReason === NoScrobbleReason.ScrobblingDisabled ? null : item.linearType ===
      LinearType.Station ? (
        <RadioScrobblingOptions station={item} />
    ) : isPlaylistItem(item) ? (
        <TrackScrobblingOptions track={item} noScrobbleReason={noScrobbleReason} />
    ) : null;
}

interface RadioScrobblingOptionsProps<T extends MediaItem> {
    station: T;
}

function RadioScrobblingOptions<T extends MediaItem>({station}: RadioScrobblingOptionsProps<T>) {
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
            <span className="status">
                <input
                    id={`${id}-no-scrobble`}
                    type="checkbox"
                    defaultChecked={!canScrobbleRadio(station.src)}
                    onChange={handleChange}
                />
                <label htmlFor={`${id}-no-scrobble`}>
                    Don&apos;t scrobble tracks from this station
                </label>
            </span>
        </p>
    );
}

interface ListenScrobblingOptionsProps {
    listen: Listen;
    noScrobbleReason: NoScrobbleReason;
    scrobblerId?: ScrobblerId;
}

function ListenScrobblingOptions({
    listen,
    noScrobbleReason,
    scrobblerId,
}: ListenScrobblingOptionsProps) {
    const fix = useCallback(async () => {
        if (noScrobbleReason === NoScrobbleReason.NotEnoughMetadata) {
            await showScrobbleAsDialog(listen);
        } else if (noScrobbleReason === NoScrobbleReason.MetadataNotVerified) {
            await updateListens([
                {
                    playedAt: listen.playedAt,
                    linearType: LinearType.MusicTrack,
                },
            ]);
        } else {
            await updateListens([
                {
                    playedAt: listen.playedAt,
                    scrobbleOverride: 'scrobble',
                },
            ]);
        }
    }, [listen, noScrobbleReason]);

    return (
        <p className={`scrobbling-options ${scrobblerId || ''}`}>
            <span className="status">
                {noScrobbleReason === NoScrobbleReason.None
                    ? 'Pending'
                    : getNoScrobbleReasonText(noScrobbleReason, listen)}
            </span>
            {noScrobbleReason > NoScrobbleReason.InvalidType ? (
                <Button
                    type="button"
                    className={`small ${
                        noScrobbleReason === NoScrobbleReason.NotEnoughMetadata
                            ? 'scrobble-as'
                            : 'scrobble-anyway'
                    }`}
                    onClick={fix}
                    onContextMenu={cancelEvent}
                >
                    {noScrobbleReason === NoScrobbleReason.NotEnoughMetadata
                        ? 'Scrobble as…'
                        : 'Scrobble anyway'}
                </Button>
            ) : null}
        </p>
    );
}

interface TrackScrobblingOptionsProps {
    track: PlaylistItem;
    noScrobbleReason: NoScrobbleReason;
}

function TrackScrobblingOptions({track, noScrobbleReason}: TrackScrobblingOptionsProps) {
    const id = useId();

    const handleChange = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const noScrobble = event.target.checked;
            updateScrobbleData(track, {scrobbleOverride: noScrobble ? 'no-scrobble' : undefined});
        },
        [track]
    );

    const fix = useCallback(async () => {
        if (noScrobbleReason === NoScrobbleReason.MetadataNotVerified) {
            updateScrobbleData(track, {linearType: LinearType.MusicTrack});
        } else {
            await showScrobbleAsDialog(track);
        }
    }, [track, noScrobbleReason]);

    return (
        <p className="scrobbling-options">
            <span className="status">
                {[NoScrobbleReason.None, NoScrobbleReason.DisabledByTrack].includes(
                    noScrobbleReason
                ) ? (
                    <>
                        <input
                            id={`${id}-no-scrobble`}
                            type="checkbox"
                            defaultChecked={noScrobbleReason === NoScrobbleReason.DisabledByTrack}
                            onChange={handleChange}
                        />
                        <label htmlFor={`${id}-no-scrobble`}>Don&apos;t scrobble this track</label>
                    </>
                ) : (
                    getNoScrobbleReasonText(noScrobbleReason, track)
                )}
            </span>
            {[
                NoScrobbleReason.None,
                NoScrobbleReason.NotEnoughMetadata,
                NoScrobbleReason.MetadataNotVerified,
                NoScrobbleReason.DisabledByTrack,
            ].includes(noScrobbleReason) ? (
                <Button
                    type="button"
                    className="small"
                    disabled={noScrobbleReason === NoScrobbleReason.DisabledByTrack}
                    onClick={fix}
                    onContextMenu={cancelEvent}
                >
                    {noScrobbleReason === NoScrobbleReason.MetadataNotVerified
                        ? 'Verify'
                        : 'Scrobble as…'}
                </Button>
            ) : null}
        </p>
    );
}

export function updateScrobbleData(item: PlaylistItem, values: ScrobbleData): void {
    dispatchMetadataChanges({
        match: (object) => object.src === item.src,
        values,
    });
    if (item.linearType && playback.currentItem?.id === item.id) {
        // Update playback metadata for radio tracks.
        if (miniPlayer.active) {
            miniPlayer.setScrobbleData(values);
        } else {
            playback.currentItem = {...playback.currentItem, ...values};
        }
    } else {
        if (isMiniPlayer) {
            miniPlayerRemote.onScrobbleDataChange(item.src, values);
        }
    }
}

function isPlaylistItem(item: MediaItem): item is PlaylistItem {
    return 'id' in item;
}
