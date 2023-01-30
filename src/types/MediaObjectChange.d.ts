import MediaObject from './MediaObject';

export default interface MediaObjectChange<T extends MediaObject> {
    readonly match: (item: MediaObject) => boolean;
    readonly values: Partial<T>;
}
