import React from 'react';
import './EmptyScreen.scss';

export interface EmptyScreenProps {
    children?: React.ReactNode;
}

export default function EmptyScreen({children}: EmptyScreenProps) {
    return <div className="panel empty-screen">{children}</div>;
}
