import React from 'react';
import Icon from 'components/Icon';
import './AppTitle.scss';

export default function AppTitle() {
    return (
        <h1 className="app-title">
            <span className="app-name">
                <Icon className="app-icon" name="ampcast" />
                <span className="app-text">{__app_name__}</span>
            </span>{' '}
            <span className="app-version">{__app_version__}</span>
        </h1>
    );
}
