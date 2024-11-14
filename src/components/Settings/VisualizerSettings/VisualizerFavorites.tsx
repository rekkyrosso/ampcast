import React, {useCallback, useState} from 'react';
import {t} from 'services/i18n';
import {getVisualizerProvider} from 'services/visualizer/visualizerProviders';
import visualizerStore from 'services/visualizer/visualizerStore';
import {confirm} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import ListView, {ListViewLayout} from 'components/ListView';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useIsPlaying from 'hooks/useIsPlaying';
import useVisualizerFavorites, {KeyedVisualizerFavorite} from './useVisualizerFavorites';
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
                return provider?.shortName || provider?.name || providerId;
            },
            width: 8,
        },
        {
            title: 'Name',
            render: ({title, name}) => title || name,
            width: 12,
        },
        {
            title: '', // status is mostly empty so leave the title empty
            render: ({status}) => status,
            width: 16,
        },
    ],
};

export default function VisualizerFavorites() {
    const isPlaying = useIsPlaying();
    const currentVisualizer = useCurrentVisualizer();
    const favorites = useVisualizerFavorites();
    const [[selectedFavorite], setSelectedFavorites] = useState<readonly KeyedVisualizerFavorite[]>(
        []
    );
    const canAddCurrentVisualizer =
        currentVisualizer &&
        currentVisualizer.providerId !== 'none' &&
        !visualizerStore.hasFavorite(currentVisualizer);

    const handleAddClick = useCallback(async () => {
        if (currentVisualizer) {
            await visualizerStore.addFavorite(currentVisualizer);
        }
    }, [currentVisualizer]);

    const handleDeleteClick = useCallback(async () => {
        if (selectedFavorite) {
            const confirmed = await confirm({
                icon: 'visualizer',
                title: t('Favorite Visualizers'),
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
                {isPlaying ? (
                    <button
                        className="visualizer-favorites-add"
                        type="button"
                        disabled={!canAddCurrentVisualizer}
                        onClick={handleAddClick}
                    >
                        Add current visualizer
                    </button>
                ) : null}
                <button
                    className="visualizer-favorites-delete"
                    type="button"
                    disabled={!selectedFavorite}
                    onClick={handleDeleteClick}
                >
                    Remove
                </button>
            </p>
            <DialogButtons />
        </form>
    );
}
