import React, {useCallback} from 'react';
import MediaService from 'types/MediaService';
import {getService} from 'services/mediaServices';
import {confirm} from 'components/Dialog';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';
import {showMediaServiceSettingsDialog} from 'components/Settings/MediaLibrarySettings/MediaServiceSettingsDialog';
import {MediaSourceView} from './MediaSources';
import {showEditSourcesDialog} from './EditSourcesDialog';

export default async function showMediaSourcesMenu(
    item: MediaSourceView,
    target: HTMLElement,
    x: number,
    y: number
): Promise<string | undefined> {
    return showPopupMenu(
        (props: PopupMenuProps) => <MediaSourcesMenu {...props} source={item.source} />,
        target,
        x,
        y,
        'left'
    );
}

interface MediaSourcesMenuProps {
    source: MediaSourceView['source'];
}

function MediaSourcesMenu({source, ...props}: PopupMenuProps & MediaSourcesMenuProps) {
    const isService = isMediaService(source);

    const handleDisconnectClick = useCallback(async () => {
        if (isMediaService(source)) {
            const confirmed = await confirm({
                icon: source.id,
                title: source.name,
                message: `Disconnect from ${source.name}?`,
            });
            if (confirmed) {
                source.logout();
            }
        }
    }, [source]);

    const handleSettingsClick = useCallback(() => {
        const [serviceId] = source.id.split('/');
        const service = getService(serviceId);
        if (service) {
            showMediaServiceSettingsDialog(service);
        }
    }, [source]);

    const handleEditSourcesClick = useCallback(() => {
        const [serviceId] = source.id.split('/');
        const service = getService(serviceId);
        if (service) {
            showEditSourcesDialog(service);
        }
    }, [source]);

    return (
        <PopupMenu {...props}>
            {isService ? (
                <>
                    <PopupMenuItem
                        label={`${source.name} Settings…`}
                        onClick={handleSettingsClick}
                    />
                    {source.isConnected() ? (
                        <PopupMenuItem
                            label={`Disconnect from ${source.name}…`}
                            onClick={handleDisconnectClick}
                        />
                    ) : null}
                    <PopupMenuSeparator />
                </>
            ) : null}
            <PopupMenuItem label="Edit sources…" onClick={handleEditSourcesClick} />
        </PopupMenu>
    );
}

function isMediaService(source: MediaSourceView['source']): source is MediaService {
    return 'serviceType' in source;
}
