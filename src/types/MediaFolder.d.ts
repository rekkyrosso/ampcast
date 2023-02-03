import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import MediaFolderItem from './MediaFolderItem';
import Pager from './Pager';

export default interface MediaFolder extends BaseMediaObject {
    readonly itemType: ItemType.Folder;
    readonly fileName: string;
    readonly pager: Pager<MediaFolderItem>;
    readonly parent: MediaFolder | null;
}
