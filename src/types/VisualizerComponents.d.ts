import type React from 'react';

export default interface VisualizerComponents {
    readonly Settings: React.FC;
}

export interface VisualizerSettingsComponent {
    ref?: React.RefObject<VisualizerSettingsComponentHandle | null>;
}

export interface VisualizerSettingsComponentHandle {
    submit?: () => void;
}
