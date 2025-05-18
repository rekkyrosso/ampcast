const enum PlaybackType {
    Direct = 0,
    HLS = 1,
    DASH = 2, // Not currently used.
    IFrame = 3,
    Icecast = 4,
    IcecastM3u = 5, // `.m3u` or `.pls`
    IcecastOgg = 6,
    HLSMetadata = 11,
}

export default PlaybackType;
