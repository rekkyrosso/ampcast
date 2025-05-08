const enum LinearType {
    NonLinear = 0,
    OnDemand = NonLinear,
    Station = 1, // Radio/TV station/channel
    Programme = 10, // Radio/TV programme (no music metadata)
    MusicTrack = 20, // Music track (or music video). For scrobbling.
    Ad = 99, // Commercial break
    OffAir = -1,
}

export default LinearType;
