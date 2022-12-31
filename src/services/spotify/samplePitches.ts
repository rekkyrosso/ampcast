interface Note {
    index: number;
    value: number;
}

const notes: Note[] = [16.35, 17.32, 18.35, 19.45, 20.6, 21.83, 23.12, 24.5, 25.96, 27.5, 29.14, 30.87]
    .map((note, index) => {
        const range = [{index, value: note}];
        for (let i = 1; i < 12; i++) {
            range[i] = {index, value: note * 2 ** i};
        }
        return range;
    })
    .flat()
    .sort((a, b) => a.value - b.value);

export function samplePitches(pitches: readonly number[], sample: number, sampleSize: number) {
    return getNoteValues(sample, sampleSize)
        .map(({index, value}) => pitches[index] * value)
        .reduce((total, value) => total + value, 0);
}

function getNoteValues(sample: number, sampleSize: number) {
    const min = sample * sampleSize;
    const max = min + sampleSize;
    const matches = notes.filter((note) => note.value >= min && note.value < max);
    if (matches.length > 0) {
        return matches.map(({index}) => ({index, value: 1}));
    }
    for (let i = 0; i < notes.length; i++) {
        const maxNote = notes[i];
        if (maxNote.value > max) {
            const minNote = notes[i - 1];
            const distance = maxNote.value - minNote.value;
            return [
                {index: minNote.index, value: 1 - (max - minNote.value) / distance},
                {index: maxNote.index, value: 1 - (maxNote.value - min) / distance},
            ];
        }
    }
    return [];
}
