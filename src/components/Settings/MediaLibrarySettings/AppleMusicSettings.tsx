import React from 'react';
import apple from 'services/apple';
import MediaServiceSettings from './MediaServiceSettings';

export default function AppleMusicSettings() {
    return <MediaServiceSettings service={apple} />;
}
