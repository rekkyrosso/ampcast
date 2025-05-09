const enum PlaybackType {
    Direct = 0,
    HLS = 1,
    DASH = 2,
    IFrame = 3,
    Icecast = 4,
    Playlist = 5, // `.m3u` or `.pls`
}

export default PlaybackType;
