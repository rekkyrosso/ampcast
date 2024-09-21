import React from 'react';
import MediaService from 'types/MediaService';
import {confirm} from 'components/Dialog';
import MediaServiceLabel from 'components/MediaSources/MediaServiceLabel';
import {getEnabledServices} from 'services/mediaServices';
import {isSourceVisible} from 'services/mediaServices/servicesSettings';
import {Logger} from 'utils';
import './confirmDisconnectServices.scss';

const logger = new Logger('confirmDisconnectServices');

export default async function confirmDisconnectServices(
    services: readonly MediaService[]
): Promise<boolean> {
    services = services.filter((service) => service.isConnected() && !hasDependentService(service));
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
        if (confirmed) {
            try {
                await Promise.all(
                    services
                        .filter((service) => {
                            if (service.authService && isSourceVisible(service.authService)) {
                                return false;
                            }
                            return true;
                        })
                        .map((service) => service.logout())
                );
            } catch (err) {
                logger.error(err);
            }
        }
    }
    return confirmed;
}

function hasDependentService(service: MediaService): boolean {
    return getEnabledServices()
        .filter((dependent) => dependent.authService === service)
        .some(isSourceVisible);
}
