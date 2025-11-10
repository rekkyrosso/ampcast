import React, {useCallback, useId, useRef} from 'react';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import {Logger} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
import {dispatchMetadataChanges} from 'services/metadata';
import {removeRecentPlaylist, updateRecentPlaylist} from 'services/recentPlaylists';
import Dialog, {DialogProps, alert, confirm, error, showDialog} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import './EditPlaylistDialog.scss';
import {Writable} from 'type-fest';
import MediaService from 'types/MediaService';

const logger = new Logger('CreatePlaylistDialog');

export async function showEditPlaylistDialog(playlist: MediaPlaylist): Promise<void> {
    await showDialog((props: DialogProps) => <EditPlaylistDialog {...props} playlist={playlist} />);
}

export interface EditPlaylistDialogProps extends DialogProps {
    playlist: MediaPlaylist;
}

export default function EditPlaylistDialog({playlist, ...props}: EditPlaylistDialogProps) {
    const id = useId();
    const nameRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const isPublicRef = useRef<HTMLInputElement>(null);
    const [serviceId] = playlist.src.split(':');

    const handleSubmit = useCallback(async () => {
        const service = getServiceFromSrc(playlist);
        if (service?.editPlaylist) {
            try {
                const title = nameRef.current!.value;
                const description = descriptionRef.current!.value;
                const values: Pick<Writable<MediaPlaylist>, 'title' | 'description' | 'public'> = {
                    title,
                    description,
                };
                if (!noPublicOption(service.id)) {
                    values.public = isPublicRef.current!.checked;
                }
                const hasChanged = Object.keys(values).some(
                    (key) => (playlist as any)[key] !== (values as any)[key]
                );
                if (!hasChanged) {
                    return;
                }
                if (title !== playlist.title && service.getPlaylistByName) {
                    const confirmed = await confirmOverWriteExistingPlaylist(service, title);
                    if (!confirmed) {
                        return;
                    }
                }
                const updatedPlaylist = {
                    ...playlist,
                    ...values,
                };
                await service.editPlaylist(updatedPlaylist);
                updateRecentPlaylist(updatedPlaylist);
                dispatchMetadataChanges({
                    values,
                    match: (object) => service.compareForRating(object, playlist),
                });
            } catch (err) {
                logger.error(err);
                await error('An error occurred while updating your playlist.');
            }
        }
    }, [playlist]);

    return (
        <Dialog
            {...props}
            className="edit-playlist-dialog"
            icon={serviceId as MediaServiceId}
            title="Edit playlist"
        >
            <form method="dialog" onSubmit={handleSubmit}>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-name`}>Name:</label>
                        <input
                            type="text"
                            id={`${id}-name`}
                            defaultValue={playlist.title}
                            required
                            ref={nameRef}
                        />
                    </p>
                    <p>
                        <label htmlFor={`${id}-description`}>Description:</label>
                        <textarea
                            id={`${id}-description`}
                            rows={4}
                            cols={40}
                            defaultValue={playlist.description}
                            ref={descriptionRef}
                        />
                    </p>
                    <p className="edit-playlist-dialog-public" hidden={noPublicOption(serviceId)}>
                        <label htmlFor={`${id}-public`}>Public:</label>
                        <input
                            type="checkbox"
                            id={`${id}-public`}
                            defaultChecked={playlist.public}
                            // Toggling `public` status not currently working for Spotify.
                            // https://community.spotify.com/t5/Spotify-for-Developers/Api-to-create-a-private-playlist-doesn-t-work/m-p/6504548
                            disabled={noPublicOption(serviceId) || serviceId === 'spotify'}
                            ref={isPublicRef}
                        />
                    </p>
                </div>
                <DialogButtons />
            </form>
        </Dialog>
    );
}

export async function confirmOverWriteExistingPlaylist(
    service: MediaService,
    name: string
): Promise<boolean> {
    let confirmed = true;
    if (service.getPlaylistByName) {
        const existingPlaylist = await service.getPlaylistByName(name);
        if (existingPlaylist) {
            confirmed = false;
            if (service.deletePlaylist) {
                confirmed = await confirm({
                    icon: service.icon,
                    title: `${service.name}: Playlists`,
                    message: `Overwrite existing playlist '${name}'?`,
                });
                if (confirmed) {
                    await service.deletePlaylist(existingPlaylist);
                    removeRecentPlaylist(existingPlaylist);
                }
            } else {
                await alert({
                    icon: service.icon,
                    title: `${service.name}: Playlists`,
                    message: 'A playlist with that name already exists.',
                });
            }
        }
    }
    return confirmed;
}

export function noPublicOption(serviceId: string): boolean {
    switch (serviceId) {
        case 'localdb':
        case 'emby':
        case 'jellyfin':
        case 'plex':
            return true;

        default:
            return false;
    }
}
