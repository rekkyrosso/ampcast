import MediaObject from './MediaObject';

export default interface MediaObjectChange<T extends MediaObject> {
    readonly match: (item: T) => boolean;
    readonly values: Partial<T>;
}
