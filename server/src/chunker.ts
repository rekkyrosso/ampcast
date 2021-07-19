export async function* chunk<T>(items: T[], chunkSize = 100): AsyncGenerator<T[], void>  {
    const chunkCount = Math.ceil(items.length / chunkSize);
    for (let i = 0; i < chunkCount; i++) {
        yield items.slice(i * chunkSize, (i + 1) * chunkSize);
    }
}

export default {chunk};
