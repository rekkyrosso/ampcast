declare module 'butterchurn' {
    function createVisualizer(
        context: BaseAudioContext,
        canvas: HTMLCanvasElement,
        options: butterchurn.VisualizerOptions
    ): butterchurn.Visualizer;

    interface Visualizer {
        connectAudio(node: AudioNode): void;
        disconnectAudio(node: AudioNode): void;
        setRendererSize(width: number, height: number): void;
        loadPreset(preset: Record<string, MilkdropRawData>, transitionTime: number): void;
        launchSongTitleAnim(title: string): void;
        render(): void;
    }

    interface VisualizerOptions {
        width: number;
        height: number;
        meshWidth?: number;
        meshHeight?: number;
        pixelRatio?: number;
    }
}

declare module 'butterchurn-presets/dist/base.min' {
    export default 'presets' as Record<string, MilkdropRawData>;
}

declare module 'butterchurn-presets/dist/extra.min' {
    export default 'presets' as Record<string, MilkdropRawData>;
}

declare module 'butterchurn-presets/dist/image.min' {
    export default 'presets' as Record<string, MilkdropRawData>;
}

type MilkdropRawData = any;
