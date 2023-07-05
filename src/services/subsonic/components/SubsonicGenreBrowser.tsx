import React, {useCallback, useEffect, useState} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import {PagedBrowser, PagedBrowserProps} from 'components/MediaBrowser';
import PageHeader from 'components/MediaBrowser/PageHeader';
import subsonic from '../subsonic';
import useGenres from './useGenres';
import useGenre from './useGenre';
import './SubsonicGenreBrowser.scss';

export default function SubsonicGenreBrowser<T extends MediaObject>({
    source,
    ...props
}: PagedBrowserProps<T>) {
    const genres = useGenres();
    const [genre, setGenre] = useState<Subsonic.Genre | undefined>();
    const pager = useGenre(source, genre);

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            setGenre(genres[Number(event.target.value)]);
        },
        [genres]
    );

    useEffect(() => {
        if (!genre) {
            setGenre(genres[0]);
        }
    }, [genres, genre]);

    return (
        <>
            <PageHeader icon={subsonic.icon}>
                {subsonic.name}: {source.title}
            </PageHeader>
            <div className="subsonic-genre-selector">
                <label htmlFor="subsonic-genres">Genre:</label>
                <select id="subsonic-genres" onChange={handleChange}>
                    {genres.map((genre, index) => (
                        <option key={genre.value} value={index}>
                            {genre.value} (
                            {source.itemType === ItemType.Album
                                ? genre.albumCount
                                : genre.songCount}
                            )
                        </option>
                    ))}
                </select>
            </div>
            <PagedBrowser {...props} source={source} pager={pager} layout={source.layout} />
        </>
    );
}
