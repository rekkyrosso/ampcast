import React from 'react';
import MediaService from 'types/MediaService';
import {confirm} from 'components/Dialog';
import MediaServiceLabel from 'components/MediaSources/MediaServiceLabel';
import './confirmDisconnectServices.scss';

export default async function confirmDisconnectServices(
    services: readonly MediaService[]
): Promise<boolean> {
    services = services.filter((service) => service.isConnected());
    let confirmed = services.length === 0;
    if (!confirmed) {
        confirmed = await confirm({
            message: (
                <div className="confirm-disconnect-services">
                    <p>You will be disconnected from the following services:</p>
                    <ul>
                        {services.map((service) => (
                            <li key={service.id}>
                                <MediaServiceLabel service={service} />
                            </li>
                        ))}
                    </ul>
                </div>
            ),
            okLabel: 'Disconnect',
            system: true,
        });
    }
    return confirmed;
}
