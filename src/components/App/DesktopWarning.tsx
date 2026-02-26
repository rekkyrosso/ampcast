import React from 'react';
import Button from 'components/Button';
import AppTitle from './AppTitle';
import './DesktopWarning.scss';

export interface DesktopWarningProps {
    onDismiss: () => void;
}

export default function DesktopWarning({onDismiss}: DesktopWarningProps) {
    return (
        <div className="desktop-warning">
            <AppTitle />
            <p>This application is intended for a desktop browser.</p>
            <p>
                <Button onClick={onDismiss}>Proceed</Button>
            </p>
        </div>
    );
}
