declare module 'butterchurn' {
    function createVisualizer(
        context: BaseAudioContext,
        canvas: HTMLCanvasElement,
        options: butterchurn.VisualizerOptions
    ): butterchurn.Visualizer;

    interface Visualizer {
        connectAudio(node: AnalyserNode): void;
        disconnectAudio(node: AnalyserNode): void;
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

declare module 'butterchurn-presets' {
    export default 'butterchurn-presets' as Record<string, MilkdropRawData>;
}

declare module 'butterchurn-presets/dist/extra' {
    export default 'butterchurn-presets' as Record<string, MilkdropRawData>;
}

type MilkdropRawData = any;
