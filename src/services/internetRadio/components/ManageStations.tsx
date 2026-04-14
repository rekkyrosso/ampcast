import React, {useCallback, useRef, useState} from 'react';
import MediaItem from 'types/MediaItem';
import {t} from 'services/i18n';
import Button from 'components/Button';
import {DialogButtons} from 'components/Dialog';
import ListView, {ListViewHandle, ListViewLayout} from 'components/ListView';
import {Country, IconTitle} from 'components/MediaList/useMediaListLayout';
import confirmDeleteStation from 'components/Actions/confirmDeleteStation';
import stationStore from '../stationStore';
import useFavoriteStations from './useFavoriteStations';
import {showEditStationDialog} from './EditStationDialog';
import './ManageStations.scss';

const layout: ListViewLayout<MediaItem> = {
    view: 'details',
    sizeable: true,
    showTitles: true,
    cols: [
        {title: 'Station', className: 'title', width: 15, render: IconTitle},
        {title: 'Country', className: 'country', render: Country},
    ],
};

export default function ManageStations() {
    const listViewRef = useRef<ListViewHandle>(null);
    const favorites = useFavoriteStations();
    const [selectedStations, setSelectedStations] = useState<readonly MediaItem[]>([]);
    const [selectedStation] = selectedStations;

    const handleEditClick = useCallback(() => {
        if (selectedStation) {
            showEditStationDialog(selectedStation, true);
        }
    }, [selectedStation]);

    const handleDeleteClick = useCallback(async () => {
        if (selectedStation) {
            const name = selectedStation.title;
            const confirmed = await confirmDeleteStation(name);
            if (confirmed) {
                await stationStore.removeFavorite(selectedStation);
            }
        }
    }, [selectedStation]);

    return (
        <form className="manage-stations" method="dialog">
            <ListView
                title={t('Favorite stations')}
                className="media-list"
                items={favorites}
                itemKey="src"
                layout={layout}
                onDelete={handleDeleteClick}
                onSelect={setSelectedStations}
                ref={listViewRef}
            />
            <p className="manage-stations-buttons">
                <Button type="button" onClick={handleEditClick} disabled={!selectedStation}>
                    Edit…
                </Button>
                <Button
                    className="manage-stations-delete"
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={!selectedStation}
                >
                    Delete
                </Button>
            </p>
            <DialogButtons />
        </form>
    );
}
