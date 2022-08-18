declare module 'butterchurn' {
    function createVisualizer(
        context: BaseAudioContext,
        canvas: HTMLCanvasElement,
        options: ButterchurnVisualizerOptions
    ): ButterchurnVisualizer;
}

declare module 'butterchurn-presets' {
    export default 'butterchurn-presets' as Record<string, MilkdropRawData>;
}

interface ButterchurnVisualizer {
    connectAudio(node: AnalyserNode): void;
    disconnectAudio(node: AnalyserNode): void;
    setRendererSize(width: number, height: number): void;
    loadPreset(preset: Record<string, MilkdropRawData>, transitionTime: number): void;
    launchSongTitleAnim(title: string): void;
    render(): void;
}

interface ButterchurnVisualizerOptions {
    width: number;
    height: number;
    meshWidth?: number;
    meshHeight?: number;
    pixelRatio?: number;
}

type MilkdropRawData = any;

interface Window {
    butterchurnPresets: Record<string, MilkdropRawData>;
    butterchurnPresetsExtra: Record<string, MilkdropRawData>;
}
