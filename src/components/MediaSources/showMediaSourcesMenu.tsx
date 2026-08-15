import React, {useCallback} from 'react';
import MediaService from 'types/MediaService';
import pinStore from 'services/pins/pinStore';
import {confirm} from 'components/Dialog';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';
import {showMediaServiceSettingsDialog} from 'components/Settings/MediaLibrarySettings/MediaServiceSettingsDialog';
import {showMediaServicePinsDialog} from 'components/Settings/MediaLibrarySettings/MediaServicePinsDialog';
import {showEditSourcesDialog} from './EditSourcesDialog';

export default async function showMediaSourcesMenu(
    service: MediaService,
    target: HTMLElement,
    x: number,
    y: number
): Promise<string | undefined> {
    return showPopupMenu(
        (props: PopupMenuProps) => <MediaSourcesMenu {...props} service={service} />,
        target,
        x,
        y,
        'left'
    );
}

interface MediaSourcesMenuProps {
    service: MediaService;
}

function MediaSourcesMenu({service, ...props}: PopupMenuProps & MediaSourcesMenuProps) {
    const hasPins = pinStore.getPinsForService(service.id).length > 0;

    const handleDisconnectClick = useCallback(async () => {
        if (service) {
            const confirmed = await confirm({
                icon: service.id,
                title: service.name,
                message: `Disconnect from ${service.name}?`,
            });
            if (confirmed) {
                service.logout();
            }
        }
    }, [service]);

    const handleSettingsClick = useCallback(() => {
        if (service) {
            showMediaServiceSettingsDialog(service);
        }
    }, [service]);

    const handleEditSourcesClick = useCallback(() => {
        if (service) {
            showEditSourcesDialog(service);
        }
    }, [service]);

    const handleManagePinsClick = useCallback(() => {
        if (service) {
            showMediaServicePinsDialog(service);
        }
    }, [service]);

    return (
        <PopupMenu {...props}>
            <PopupMenuItem label={`${service.name} Settings…`} onClick={handleSettingsClick} />
            {!service.noAuth && service.isConnected() ? (
                <PopupMenuItem
                    label={`Disconnect from ${service.name}…`}
                    onClick={handleDisconnectClick}
                />
            ) : null}
            <PopupMenuSeparator />
            <PopupMenuItem label="Edit sources…" onClick={handleEditSourcesClick} />
            {service?.createSourceFromPin ? (
                <PopupMenuItem
                    label="Manage pins…"
                    onClick={handleManagePinsClick}
                    disabled={!hasPins}
                />
            ) : null}
        </PopupMenu>
    );
}
