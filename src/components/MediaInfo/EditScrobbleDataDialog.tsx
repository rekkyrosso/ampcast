import React, {useCallback, useId, useRef, useState} from 'react';
import LinearType from 'types/LinearType';
import PlaylistItem from 'types/PlaylistItem';
import ScrobbleData from 'types/ScrobbleData';
import {isMiniPlayer} from 'utils';
import {playback, miniPlayer, miniPlayerRemote} from 'services/mediaPlayback';
import {dispatchMetadataChanges} from 'services/metadata';
import Dialog, {DialogButtons, DialogProps, showDialog} from 'components/Dialog';
import './EditScrobbleDataDialog.scss';

export async function showEditScrobbleDataDialog(item: PlaylistItem): Promise<void> {
    await showDialog((props: DialogProps) => <EditScrobbleDataDialog {...props} item={item} />);
}

export interface EditScrobbleDataDialogProps extends DialogProps {
    item: PlaylistItem;
}

export default function EditScrobbleDataDialog({item, ...props}: EditScrobbleDataDialogProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement | null>(null);
    const data = item.scrobbleAs;
    const artist = data?.artist || item?.artists?.[0];
    const title = data?.title || item?.title;
    const album = data?.album || item?.album;
    const [valid, setValid] = useState(!!(artist && title));

    const handleSubmit = useCallback(() => {
        const data = new FormData(ref.current!);
        const scrobbleAs: ScrobbleData = {
            artist: data.get('artist') as string,
            title: data.get('title') as string,
            album: data.get('album') as string,
        };
        if (item.linearType === LinearType.MusicTrack && playback.currentItem?.id === item.id) {
            // Update playback metadata for radio tracks.
            if (miniPlayer.active) {
                miniPlayer.setScrobbleData(scrobbleAs);
            } else {
                playback.currentItem = {...playback.currentItem, scrobbleAs};
            }
        } else {
            dispatchMetadataChanges({
                match: (object) => object.src === item.src,
                values: {scrobbleAs},
            });
            if (isMiniPlayer) {
                miniPlayerRemote.onScrobbleDataChange(item.src, scrobbleAs);
            }
        }
    }, [item]);

    const handleChange = useCallback(() => {
        setValid(ref.current!.checkValidity());
    }, []);

    return (
        <Dialog
            {...props}
            className="edit-scrobble-data-dialog"
            icon="scrobble"
            title="Scrobble As"
        >
            <form method="dialog" onChange={handleChange} onSubmit={handleSubmit} ref={ref}>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-artist`}>Artist:</label>
                        <input
                            type="text"
                            id={`${id}-artist`}
                            name="artist"
                            defaultValue={artist}
                            placeholder="(required)"
                            required
                        />
                    </p>
                    <p>
                        <label htmlFor={`${id}-title`}>Title:</label>
                        <input
                            type="text"
                            id={`${id}-title`}
                            name="title"
                            defaultValue={title}
                            placeholder="(required)"
                            required
                        />
                    </p>
                    <p>
                        <label htmlFor={`${id}-album`}>Album:</label>
                        <input
                            type="text"
                            id={`${id}-album`}
                            name="album"
                            defaultValue={album}
                            placeholder="(optional)"
                        />
                    </p>
                </div>
                <DialogButtons disabled={!valid} />
            </form>
        </Dialog>
    );
}
