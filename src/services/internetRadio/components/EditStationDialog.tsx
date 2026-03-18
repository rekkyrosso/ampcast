import React, {useCallback, useId, useMemo, useRef, useState} from 'react';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import {Logger} from 'utils';
import {MAX_DURATION} from 'services/constants';
import countries from 'services/countries';
import CoverArt from 'components/CoverArt';
import Dialog, {DialogButtons, DialogProps, alert, showDialog} from 'components/Dialog';
import stationStore from '../stationStore';
import './EditStationDialog.scss';

const logger = new Logger('EditStationDialog');

export async function showEditStationDialog(station: MediaItem, system?: boolean): Promise<void> {
    await showDialog(
        (props: DialogProps) => <EditStationDialog {...props} station={station} />,
        system
    );
}

export interface EditStationDialogProps extends DialogProps {
    station?: MediaItem;
}

export default function EditStationDialog({station, ...props}: EditStationDialogProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement | null>(null);
    const isNewStation = !station;
    const [thumbnailUrl, setThumbnailUrl] = useState(() => station?.thumbnails?.[0]?.url || '');
    const [valid, setValid] = useState(!isNewStation);

    const handleSubmit = useCallback(async () => {
        try {
            const data = new FormData(ref.current!);
            const thumbnail = data.get('thumbnail') as string;
            const station: MediaItem = {
                itemType: ItemType.Media,
                mediaType: MediaType.Audio,
                linearType: LinearType.Station,
                src: data.get('src') as string,
                title: data.get('title') as string,
                externalUrl: data.get('externalUrl') as string,
                description: data.get('description') as string,
                countryCode: data.get('countryCode') as string,
                country: countries.get(data.get('countryCode') as string),
                playedAt: 0,
                duration: MAX_DURATION,
                thumbnails: thumbnail ? [{url: thumbnail, width: 400, height: 400}] : undefined,
            };
            await stationStore.addFavorite(station);
            if (isNewStation) {
                await alert({
                    icon: 'internet-radio',
                    title: 'My Stations',
                    message: 'Your station has been created.',
                });
            }
        } catch (err) {
            logger.error(err);
        }
    }, [isNewStation]);

    const handleChange = useCallback(() => {
        setValid(ref.current!.checkValidity());
    }, []);

    return (
        <Dialog
            {...props}
            className="edit-station-dialog"
            icon="internet-radio"
            title={isNewStation ? 'New station' : 'Edit station'}
        >
            <form method="dialog" onChange={handleChange} onSubmit={handleSubmit} ref={ref}>
                <div className="edit-station-dialog-main">
                    <Thumbnail url={thumbnailUrl} />
                    <div className="table-layout">
                        <p>
                            <label htmlFor={`${id}-title`}>Name:</label>
                            <input
                                type="text"
                                id={`${id}-title`}
                                name="title"
                                defaultValue={station?.title}
                                placeholder="(required)"
                                required
                            />
                        </p>
                        <p>
                            <label htmlFor={`${id}-src`}>Stream:</label>
                            <input
                                type="url"
                                id={`${id}-src`}
                                name="src"
                                defaultValue={station?.src}
                                placeholder="URL (required)"
                                required
                            />
                        </p>
                        <p>
                            <label htmlFor={`${id}-external-url`}>Website:</label>
                            <input
                                type="url"
                                id={`${id}-external-url`}
                                name="externalUrl"
                                defaultValue={station?.externalUrl}
                                placeholder="URL (optional)"
                            />
                        </p>
                        <p>
                            <label htmlFor={`${id}-thumbnail`}>Thumbnail:</label>
                            <input
                                type="url"
                                id={`${id}-thumbnail`}
                                name="thumbnail"
                                defaultValue={thumbnailUrl}
                                placeholder="URL (optional)"
                                onChange={(e) => setThumbnailUrl(e.target.value)}
                            />
                        </p>
                        <p>
                            <label htmlFor={`${id}-country-code`}>Country:</label>
                            <select
                                id={`${id}-country-code`}
                                name="countryCode"
                                defaultValue={station?.countryCode?.toUpperCase()}
                            >
                                <option value="" key="">
                                    (optional)
                                </option>
                                {[...countries.entries()].map(([code, name]) => (
                                    <option value={code} key={code}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </p>
                        <p>
                            <label htmlFor={`${id}-description`}>Description:</label>
                            <textarea
                                id={`${id}-description`}
                                name="description"
                                defaultValue={station?.description}
                                rows={2}
                                cols={40}
                                placeholder="(optional)"
                            />
                        </p>
                    </div>
                </div>
                <DialogButtons
                    disabled={!valid}
                    submitText={isNewStation ? 'Create station' : 'Confirm'}
                />
            </form>
        </Dialog>
    );
}

function Thumbnail({url}: {url: string}) {
    const item = useMemo(
        () =>
            ({
                itemType: ItemType.Media,
                linearType: LinearType.Station,
                thumbnails: [{url, width: 400, height: 400}],
            }) as any,
        [url]
    );
    return (
        <div className="thumbnail">
            <CoverArt size={480} item={item} />
        </div>
    );
}
