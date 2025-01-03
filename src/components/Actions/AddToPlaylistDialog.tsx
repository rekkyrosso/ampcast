import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import MediaSourceLayout from 'types/MediaSourceLayout';
import {Logger} from 'utils';
import {getService} from 'services/mediaServices';
import {addRecentPlaylist} from 'services/recentPlaylists';
import Dialog, {DialogProps, error, showDialog} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import PlaylistList from 'components/MediaList/PlaylistList';
import usePlaylistItemsByService from './usePlaylistItemsByService';
import useEditablePlaylistsPager from './useEditablePlaylistsPager';
import './AddToPlaylistDialog.scss';

const logger = new Logger('AddToPlaylistDialog');

export async function showAddToPlaylistDialog<T extends MediaItem>(
    items: readonly T[]
): Promise<void> {
    await showDialog((props: DialogProps) => <AddToPlaylistDialog {...props} items={items} />);
}

export interface AddToPlaylistDialogProps<T extends MediaItem> extends DialogProps {
    items: readonly T[];
}

const layout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card minimal',
    fields: ['Thumbnail', 'Title', 'TrackCount'],
};

export default function AddToPlaylistDialog<T extends MediaItem>({
    items,
    ...props
}: AddToPlaylistDialogProps<T>) {
    const id = useId();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const serviceRef = useRef<HTMLSelectElement>(null);
    const itemsByService = usePlaylistItemsByService(items);
    const [selectedService, setSelectedService] = useState<MediaService | null>(null);
    const playlistsPager = useEditablePlaylistsPager(selectedService);
    const [selectedPlaylist, setSelectedPlaylist] = useState<MediaPlaylist | null>(null);
    const size = items.length;

    useEffect(() => {
        setSelectedService((service) => service || itemsByService[0]?.service || null);
    }, [itemsByService]);

    const submit = useCallback(async () => {
        if (selectedService?.addToPlaylist && selectedPlaylist) {
            dialogRef.current!.close();
            const option = itemsByService.find((option) => option.service === selectedService);
            const items = option?.items;
            try {
                await selectedService.addToPlaylist(selectedPlaylist, items!);
                addRecentPlaylist(selectedPlaylist);
            } catch (err) {
                logger.error(err);
                await error('An error occurred while updating your playlist.');
            }
        }
    }, [selectedService, selectedPlaylist, itemsByService]);

    const handleSubmitClick = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            await submit();
        },
        [submit]
    );

    const handleServiceChange = useCallback(() => {
        const serviceId = serviceRef.current!.value as MediaServiceId;
        const service = getService(serviceId)!;
        setSelectedService(service);
    }, []);

    const handlePlaylistSelect = useCallback(([playlist]: readonly MediaPlaylist[]) => {
        setSelectedPlaylist(playlist);
    }, []);

    return (
        <Dialog
            {...props}
            className={`add-to-playlist-dialog service-${selectedService?.id || ''}`}
            title="Add to playlist"
            ref={dialogRef}
        >
            <form method="dialog" onSubmit={handleSubmitClick}>
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
                <PlaylistList
                    title={selectedService ? `${selectedService?.name}: Playlists` : ''}
                    pager={playlistsPager}
                    layout={layout}
                    onContextMenu={() => undefined}
                    onDoubleClick={submit}
                    onSelect={handlePlaylistSelect}
                />
                <DialogButtons submitText="Add" disabled={!selectedPlaylist} />
            </form>
        </Dialog>
    );
}
