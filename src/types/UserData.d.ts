export default interface UserData {
    readonly rating?: number;
    readonly globalLikes?: number;
    readonly globalRating?: number;
    readonly playCount?: number;
    readonly globalPlayCount?: number;
    readonly inLibrary?: boolean;
    readonly isPinned?: boolean;
}
