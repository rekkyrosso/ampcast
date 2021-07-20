import ItemType from 'types/ItemType';
import MediaSource from 'types/MediaSource';
import SimplePager from './SimplePager';

const emptySource: MediaSource<any> = {
    id: '',
    title: '',
    icon: 'note',
    itemType: ItemType.Media,
    search: () => new SimplePager(),
};

export default emptySource;
