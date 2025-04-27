export default interface RadioStation {
    readonly id: string;
    readonly name: string;
    readonly api: string; // Url for `NowPlaying` data
    readonly location: string; // Descriptive string
    readonly stream: string; // Playable stream url
    readonly timezone?: string; // TODO: Needed?
}
