import React, {useCallback, useId, useRef, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaServiceId from 'types/MediaServiceId';
import {Logger} from 'utils';
import {getService} from 'services/mediaServices';
import {addRecentPlaylist} from 'services/recentPlaylists';
import Dialog, {DialogProps, alert, error, showDialog} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import usePlaylistItemsByService from './usePlaylistItemsByService';
import './CreatePlaylistDialog.scss';

const logger = new Logger('CreatePlaylistDialog');

export async function showCreatePlaylistDialog<T extends MediaItem>(
    items: readonly T[]
): Promise<void> {
    await showDialog((props: DialogProps) => <CreatePlaylistDialog {...props} items={items} />);
}

export interface CreatePlaylistDialogProps<T extends MediaItem> extends DialogProps {
    items: readonly T[];
}

export default function CreatePlaylistDialog<T extends MediaItem>({
    items,
    ...props
}: CreatePlaylistDialogProps<T>) {
    const id = useId();
    const serviceRef = useRef<HTMLSelectElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const isPublicRef = useRef<HTMLInputElement>(null);
    const itemsByService = usePlaylistItemsByService(items);
    const [serviceId, setServiceId] = useState<MediaServiceId>(() => itemsByService[0]?.service.id);
    const size = items.length;

    const handleSubmit = useCallback(async () => {
        const serviceId = serviceRef.current!.value;
        const service = getService(serviceId);
        if (service?.createPlaylist) {
            const name = nameRef.current!.value;
            const description = descriptionRef.current!.value;
            const isPublic = isPublicRef.current!.checked;
            const option = itemsByService.find((option) => option.service === service);
            const items = option?.items;
            try {
                const playlist = await service.createPlaylist(name, {description, isPublic, items});
                await alert({
                    icon: service.id,
                    title: service.name,
                    message: 'Your playlist has been created.',
                });
                addRecentPlaylist(playlist);
            } catch (err) {
                logger.error(err);
                await error('An error occurred while creating your playlist.');
            }
        }
    }, [itemsByService]);

    const handleServiceChange = useCallback(() => {
        const serviceId = serviceRef.current!.value as MediaServiceId;
        setServiceId(serviceId);
    }, []);

    return (
        <Dialog
            {...props}
            className={`create-playlist-dialog service-${serviceId || ''}`}
            title="Create Playlist"
        >
            <form method="dialog" onSubmit={handleSubmit}>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-service`}>Save to:</label>
                        <select
                            id={`${id}-service`}
                            required
                            onChange={handleServiceChange}
                            ref={serviceRef}
                        >
                            {itemsByService.map(({service, items}) => (
                                <option value={service.id} key={service.id}>
                                    {service.name} ({items.length}/{size})
                                </option>
                            ))}
                        </select>
                    </p>
                    <p>
                        <label htmlFor={`${id}-name`}>Name:</label>
                        <input type="text" id={`${id}-name`} required ref={nameRef} />
                    </p>
                    <p>
                        <label htmlFor={`${id}-description`}>Description:</label>
                        <textarea
                            id={`${id}-description`}
                            rows={2}
                            cols={40}
                            ref={descriptionRef}
                        />
                    </p>
                    <p className="save-playlist-dialog-public">
                        <label htmlFor={`${id}-public`}>Public:</label>
                        <input
                            type="checkbox"
                            id={`${id}-public`}
                            ref={isPublicRef}
                            disabled={noPublicOption(serviceId)}
                        />
                    </p>
                </div>
                <DialogButtons submitText="Save" />
            </form>
        </Dialog>
    );
}

function noPublicOption(serviceId: MediaServiceId): boolean {
    switch (serviceId) {
        case 'emby':
        case 'jellyfin':
        case 'plex':
            return true;

        default:
            return false;
    }
}
