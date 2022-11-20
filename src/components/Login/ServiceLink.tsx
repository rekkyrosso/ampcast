import React from 'react';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import {LoginProps} from './Login';

export default function ServiceLink({service}: LoginProps) {
    return (
        <p>
            <ExternalLink href={service.url}>
                <Icon name={service.icon} />
                {service.url}
            </ExternalLink>
        </p>
    );
}
