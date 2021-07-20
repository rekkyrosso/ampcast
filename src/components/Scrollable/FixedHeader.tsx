import React from 'react';

export interface FixedHeaderProps {
    children: React.ReactNode;
}

export default function FixedHeader({children}: FixedHeaderProps) {
    return <>{children}</>;
}
