import React, {useCallback, useId, useRef, useState} from 'react';
import MediaItem from 'types/MediaItem';
import PlaylistItem from 'types/PlaylistItem';
import {isListen, updateListens} from 'services/localdb/listens';
import Dialog, {DialogButtons, DialogProps, showDialog} from 'components/Dialog';
import {updateScrobbleData} from './ScrobblingOptions';
import './ScrobbleAsDialog.scss';

export async function showScrobbleAsDialog(item: MediaItem): Promise<void> {
    await showDialog((props: DialogProps) => <ScrobbleAsDialog {...props} item={item} />);
}

export interface ScrobbleAsDialogProps extends DialogProps {
    item: MediaItem;
}

export default function ScrobbleAsDialog({item, ...props}: ScrobbleAsDialogProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement | null>(null);
    const data = item.scrobbleAs;
    const artist = data?.artist || item?.artists?.[0];
    const title = data?.title || item?.title;
    const album = data?.album || item?.album;
    const [valid, setValid] = useState(!!(artist && title));

    const handleSubmit = useCallback(async () => {
        const data = new FormData(ref.current!);
        const scrobbleAs: MediaItem['scrobbleAs'] = {
            artist: data.get('artist') as string,
            title: data.get('title') as string,
            album: data.get('album') as string,
        };
        if (isListen(item)) {
            await updateListens([
                {
                    playedAt: item.playedAt,
                    scrobbleAs,
                },
            ]);
        } else if (isPlaylistItem(item)) {
            updateScrobbleData(item, {scrobbleAs});
        }
    }, [item]);

    const handleChange = useCallback(() => {
        setValid(ref.current!.checkValidity());
    }, []);

    return (
        <Dialog {...props} className="scrobble-as-dialog" icon="scrobble" title="Scrobble As">
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

function isPlaylistItem(item: MediaItem): item is PlaylistItem {
    return 'id' in item;
}
