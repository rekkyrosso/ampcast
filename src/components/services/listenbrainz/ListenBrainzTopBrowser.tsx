import React, {useCallback, useState} from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import Input from 'components/Input';
import {PagedBrowserProps} from 'components/MediaBrowser';
import AlbumBrowser from 'components/MediaBrowser/AlbumBrowser';
import MediaItemBrowser from 'components/MediaBrowser/MediaItemBrowser';
import ArtistList from 'components/MediaList/ArtistList';
import useRange from './useRange';

export type ListenBrainzRange =
    | 'week'
    | 'month'
    | 'quarter'
    | 'half_yearly'
    | 'year'
    | 'all_time'
    | 'this_week'
    | 'this_month'
    | 'this_year';

interface ListenBrainzRangeOption {
    value: ListenBrainzRange;
    text: string;
}

const options: ListenBrainzRangeOption[] = [
    {value: 'all_time', text: 'All time'},
    {value: 'this_year', text: 'Year'},
    {value: 'month', text: 'Month'},
    {value: 'week', text: 'Week'},
];

export default function ListenBrainzTopBrowser<T extends MediaObject>({
    source,
    ...props
}: PagedBrowserProps<T>) {
    const [range, setRange] = useState<ListenBrainzRange | undefined>();
    const pager = useRange(source, range);

    const handleRangeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRange(event.target.value as ListenBrainzRange);
    }, []);

    return (
        <>
            <div className="listenbrainz-range-selector options">
                <ul className="listenbrainz-ranges">
                    {options.map(({value, text}) => (
                        <li className="listenbrainz-range" key={value}>
                            <Input
                                id={`listenbrainz-range-${value}`}
                                type="radio"
                                name="listenbrainz-range"
                                value={value}
                                defaultChecked={value === 'all_time'}
                                onChange={handleRangeChange}
                            />
                            <label htmlFor={`listenbrainz-range-${value}`}>{text}</label>
                        </li>
                    ))}
                </ul>
            </div>
            <PagedBrowser {...props} source={source} pager={pager} layout={source.layout} />
        </>
    );
}

function PagedBrowser<T extends MediaObject>(props: PagedBrowserProps<T>) {
    switch (props.source.itemType) {
        case ItemType.Artist:
            return (
                <div className="panel artist-browser">
                    <ArtistList {...(props as unknown as PagedBrowserProps<MediaArtist>)} />
                </div>
            );

        case ItemType.Album:
            return <AlbumBrowser {...(props as unknown as PagedBrowserProps<MediaAlbum>)} />;

        default:
            return <MediaItemBrowser {...(props as unknown as PagedBrowserProps<MediaItem>)} />;
    }
}
