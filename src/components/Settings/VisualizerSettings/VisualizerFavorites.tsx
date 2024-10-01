import React, {useCallback, useState} from 'react';
import {t} from 'services/i18n';
import {getVisualizerProvider} from 'services/visualizer/visualizerProviders';
import visualizerStore from 'services/visualizer/visualizerStore';
import {confirm} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import ListView, {ListViewLayout} from 'components/ListView';
import useVisualizerFavorites, {KeyedVisualizerFavorite} from 'hooks/useVisualizerFavorites';
import './VisualizerFavorites.scss';

const layout: ListViewLayout<KeyedVisualizerFavorite> = {
    view: 'details',
    sizeable: true,
    showTitles: true,
    cols: [
        {
            title: 'Provider',
            render: ({providerId}) => {
                const provider = getVisualizerProvider(providerId);
                return provider?.name || providerId;
            },
            width: 12,
        },
        {
            title: 'Name',
            render: ({title, name}) => title || name,
            width: 24,
        },
    ],
};

export default function VisualizerFavorites() {
    const favorites = useVisualizerFavorites();
    const [selectedFavorites, setSelectedFavorites] = useState<readonly KeyedVisualizerFavorite[]>(
        []
    );
    const [selectedFavorite] = selectedFavorites;

    const handleDeleteClick = useCallback(async () => {
        if (selectedFavorite) {
            const confirmed = await confirm({
                title: t('Favorite visualizers'),
                message: `${t('Remove from favorites')}?`,
                okLabel: 'Remove',
                storageId: 'delete-visualizer-favorite',
                system: true,
            });
            if (confirmed) {
                await visualizerStore.removeFavorite(selectedFavorite);
            }
        }
    }, [selectedFavorite]);

    return (
        <form className="visualizer-favorites" method="dialog">
            <ListView<KeyedVisualizerFavorite>
                title="My favorites"
                items={favorites}
                itemKey="key"
                layout={layout}
                onDelete={handleDeleteClick}
                onSelect={setSelectedFavorites}
            />
            <p className="visualizer-favorites-buttons">
                <button
                    className="visualizer-favorites-delete"
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={!selectedFavorite}
                >
                    Remove
                </button>
            </p>
            <DialogButtons />
        </form>
    );
}
