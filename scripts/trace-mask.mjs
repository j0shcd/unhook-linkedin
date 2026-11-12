import potrace from 'potrace';

// Decode the existing mask directly: no shared temporary paths or file reopen.
export function tracePath(pngBuffer) {
  return new Promise((resolve, reject) => {
    const tracer = new potrace.Potrace({
      threshold: 128,
      turdSize: 8,
      optTolerance: 0.4,
      turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
    });
    tracer.loadImage(pngBuffer, (err) => {
      if (err) return reject(err);
      const svg = tracer.getSVG();
      resolve([...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' '));
    });
  });
}
