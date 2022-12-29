import React from 'react';
import './EmptyScreen.scss';

// TODO: This is not really an empty screen. It has children!
export interface EmptyScreenProps {
    children?: React.ReactNode;
}

export default function EmptyScreen({children}: EmptyScreenProps) {
    return <div className="panel empty-screen">{children}</div>;
}
