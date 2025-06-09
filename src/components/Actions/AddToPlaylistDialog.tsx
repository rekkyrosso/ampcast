import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import {Logger} from 'utils';
import {getService} from 'services/mediaServices';
import {addRecentPlaylist, getPlaylistItemsByService} from 'services/recentPlaylists';
import Dialog, {DialogProps, error, showDialog} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import PlaylistList from 'components/MediaList/PlaylistList';
import useEditablePlaylistsPager from './useEditablePlaylistsPager';
import usePlaylistItems from './usePlaylistItems';
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
const defaultLayout: MediaListLayout = {
    view: 'card minimal',
    card: {
        h1: 'Title',
        data: 'TrackCount',
    },
    details: [],
};

export default function AddToPlaylistDialog<T extends MediaItem>({
    items,
    ...props
}: AddToPlaylistDialogProps<T>) {
    const id = useId();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const serviceRef = useRef<HTMLSelectElement>(null);
    const playlistItems = usePlaylistItems(items);
    const itemsByService = getPlaylistItemsByService(playlistItems);
    const [selectedService, setSelectedService] = useState<MediaService | null>(null);
    const playlistsPager = useEditablePlaylistsPager(selectedService);
    const [selectedPlaylist, setSelectedPlaylist] = useState<MediaPlaylist | null>(null);
    const size = playlistItems.length;

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
            icon="playlist-add"
            title="Add to playlist"
            ref={dialogRef}
        >
            <form method="dialog" onSubmit={handleSubmitClick}>
                <p className="select-service">
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
                    sourceId="add-to-playlist-dialog"
                    title={selectedService ? `${selectedService?.name}: Playlists` : ''}
                    pager={playlistsPager}
                    defaultLayout={defaultLayout}
                    onContextMenu={() => undefined}
                    onDoubleClick={submit}
                    onEnter={submit}
                    onSelect={handlePlaylistSelect}
                />
                <DialogButtons submitText="Add to playlist" disabled={!selectedPlaylist} />
            </form>
        </Dialog>
    );
}
