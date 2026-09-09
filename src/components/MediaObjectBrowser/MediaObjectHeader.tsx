import React from 'react';

export interface MediaObjectHeaderProps {
    children: React.ReactNode;
}

export default function MediaObjectHeader({children}: MediaObjectHeaderProps) {
    return <div className="media-object-header">{children}</div>;
}
