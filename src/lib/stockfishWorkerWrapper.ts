export function createStockfish(): Worker {
    return new Worker(new URL('/stockfish-nnue-16-single.js', import.meta.url), {
      type: 'classic',
    });
  }
  