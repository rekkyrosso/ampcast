import React, {useCallback, useId, useRef, useState} from 'react';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import PlaylistItem from 'types/PlaylistItem';
import {getService, getServiceFromSrc} from 'services/mediaServices';
import Dialog, {DialogProps, alert, showDialog} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import {groupBy} from 'utils';
import './SavePlaylistDialog.scss';

interface SaveToOptions {
    service: MediaService;
    items: readonly PlaylistItem[];
}

export interface SavePlaylistDialogProps extends DialogProps {
    items: readonly PlaylistItem[];
}

export async function showSavePlaylistDialog(items: readonly PlaylistItem[]): Promise<void> {
    await showDialog((props: DialogProps) => <SavePlaylistDialog {...props} items={items} />);
}

export default function SavePlaylistDialog({items, ...props}: SavePlaylistDialogProps) {
    const id = useId();
    const serviceRef = useRef<HTMLSelectElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const publicRef = useRef<HTMLInputElement>(null);
    const options = getSaveToOptions(items);
    const [serviceId, setServiceId] = useState<MediaServiceId>(() => options[0]?.service.id);
    const size = items.length;

    const handleSubmit = useCallback(async () => {
        const serviceId = serviceRef.current!.value;
        const service = getService(serviceId);
        if (service?.createPlaylist) {
            const name = nameRef.current!.value;
            const description = descriptionRef.current!.value;
            const isPublic = publicRef.current!.checked;
            const option = options.find((option) => option.service === service);
            const items = option?.items;
            try {
                await service.createPlaylist(name, {description, isPublic, items});
                await alert({
                    title: <MediaSourceLabel icon={service.id} text={service.name} />,
                    message: 'Your playlist has been created.',
                });
            } catch (err) {
                console.error(err);
                await alert({
                    title: <MediaSourceLabel icon="error" text="Error" />,
                    message: 'An error occurred while creating your playlist.',
                });
            }
        }
    }, [options]);

    const handleServiceChange = useCallback(() => {
        const serviceId = serviceRef.current!.value as MediaServiceId;
        setServiceId(serviceId);
    }, []);

    return (
        <Dialog
            {...props}
            className={`save-playlist-dialog service-${serviceId || ''}`}
            title="Save Playlist"
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
                            {options.map(({service, items}) => (
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
                            ref={publicRef}
                            disabled={noPublicOption(serviceId)}
                        />
                    </p>
                </div>
                <DialogButtons submitText="Save" />
            </form>
        </Dialog>
    );
}

function getSaveToOptions(items: readonly PlaylistItem[]): readonly SaveToOptions[] {
    const byService = groupBy(items, (item) => {
        const service = getServiceFromSrc(item);
        return service?.id || '';
    });

    const plexItems = byService['plex'];
    const plexTidalItems = byService['plex-tidal'];

    if (plexTidalItems) {
        byService['plex'] = plexItems?.concat(plexTidalItems) || plexTidalItems;
    }

    const serviceOptions = Object.keys(byService)
        .filter((id) => id !== '' && id !== 'listenbrainz')
        .map((id) => ({
            service: getService(id)!,
            items: byService[id],
        }))
        .filter(({service}) => !!service?.createPlaylist);

    serviceOptions.sort((a, b) => b.items.length - a.items.length);

    const listenbrainzItems = items.filter(
        ({recording_mbid, track_mbid, isrc}) => recording_mbid || track_mbid || isrc
    );

    if (listenbrainzItems.length > 0) {
        serviceOptions.push({
            service: getService('listenbrainz')!,
            items: listenbrainzItems,
        });
    }

    return serviceOptions.filter(({service}) => service.isLoggedIn());
}

function noPublicOption(serviceId: MediaServiceId): boolean {
    switch (serviceId) {
        case 'emby':
        case 'jellyfin':
        case 'plex':
        case 'plex-tidal':
            return true;
        default:
            return false;
    }
}
