import React, {useCallback, useId, useRef, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import {Logger} from 'utils';
import {getService} from 'services/mediaServices';
import {addRecentPlaylist, getPlaylistItemsByService} from 'services/recentPlaylists';
import Dialog, {DialogProps, alert, error, showDialog} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import {confirmOverWriteExistingPlaylist, noPublicOption} from './EditPlaylistDialog';
import usePlaylistItems from './usePlaylistItems';

const logger = new Logger('CreatePlaylistDialog');

export async function showCreatePlaylistDialog<T extends MediaItem>(
    items: readonly T[],
    service?: MediaService
): Promise<void> {
    await showDialog((props: DialogProps) => (
        <CreatePlaylistDialog {...props} items={items} service={service} />
    ));
}

export interface CreatePlaylistDialogProps<T extends MediaItem> extends DialogProps {
    items: readonly T[];
    service?: MediaService;
}

export default function CreatePlaylistDialog<T extends MediaItem>({
    items,
    service,
    ...props
}: CreatePlaylistDialogProps<T>) {
    const id = useId();
    const serviceRef = useRef<HTMLSelectElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const isPublicRef = useRef<HTMLInputElement>(null);
    const playlistItems = usePlaylistItems(items);
    const itemsByService = getPlaylistItemsByService(playlistItems);
    const [serviceId, setServiceId] = useState<MediaServiceId>(
        () => service?.id || itemsByService[0]?.service.id
    );
    const size = playlistItems.length;

    const handleSubmit = useCallback(async () => {
        const service = getService(serviceId);
        if (service?.createPlaylist) {
            try {
                const title = nameRef.current!.value;
                const description = descriptionRef.current!.value;
                const isPublic = isPublicRef.current!.checked;
                const option = itemsByService.find((option) => option.service === service);
                const items = option?.items;
                if (service.getPlaylistByName) {
                    const confirmed = await confirmOverWriteExistingPlaylist(service, title);
                    if (!confirmed) {
                        return;
                    }
                }
                const playlist = await service.createPlaylist(title, {
                    description,
                    isPublic,
                    items,
                });
                await alert({
                    icon: service.icon,
                    title: `${service.name}: Playlists`,
                    message: 'Your playlist has been created.',
                });
                addRecentPlaylist(playlist);
            } catch (err) {
                logger.error(err);
                await error('An error occurred while creating your playlist.');
            }
        }
    }, [itemsByService, serviceId]);

    const handleServiceChange = useCallback(() => {
        const serviceId = serviceRef.current!.value as MediaServiceId;
        setServiceId(serviceId);
    }, []);

    return (
        <Dialog
            {...props}
            className="edit-playlist-dialog"
            icon={service?.id || 'playlist'}
            title="New playlist"
        >
            <form method="dialog" onSubmit={handleSubmit}>
                <div className="table-layout">
                    {service ? null : (
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
                    )}
                    <p>
                        <label htmlFor={`${id}-name`}>Name:</label>
                        <input type="text" id={`${id}-name`} required ref={nameRef} />
                    </p>
                    <p>
                        <label htmlFor={`${id}-description`}>Description:</label>
                        <textarea
                            id={`${id}-description`}
                            rows={4}
                            cols={40}
                            ref={descriptionRef}
                        />
                    </p>
                    <p className="edit-playlist-dialog-public" hidden={noPublicOption(serviceId)}>
                        <label htmlFor={`${id}-public`}>Public:</label>
                        <input
                            type="checkbox"
                            id={`${id}-public`}
                            ref={isPublicRef}
                            disabled={noPublicOption(serviceId)}
                        />
                    </p>
                </div>
                <DialogButtons submitText="Create playlist" />
            </form>
        </Dialog>
    );
}
