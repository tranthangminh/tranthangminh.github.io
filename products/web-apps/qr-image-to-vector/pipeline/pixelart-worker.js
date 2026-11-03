/**
 * pixelart-worker.js - Runs the Pixel Art vectorizer off the main thread
 * Receives {id, matrix, cols, rows, palette, options}; answers {id, svg} or {id, error}.
 * The pipeline scripts attach themselves to `window`, so the worker aliases it to `self` before loading them.
 */

self.window = self;

// Reuse the cache-busting query this worker was started with for the scripts it imports
importScripts(
    `./03-vectorizer-contours.js${self.location.search}`,
    `./04-vectorizer-fillet.js${self.location.search}`,
    `./03-pixelart-topology.js${self.location.search}`,
    `./04-pixelart-vectorizer.js${self.location.search}`
);

self.onmessage = (event) => {
    const { id, matrix, cols, rows, palette, options } = event.data;
    try {
        self.postMessage({ id, svg: PixelArtVectorizer.vectorize(matrix, cols, rows, palette, options) });
    } catch (err) {
        self.postMessage({ id, error: String(err && err.message ? err.message : err) });
    }
};
