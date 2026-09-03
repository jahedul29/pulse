type PathCtx = {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  closePath(): void;
};

type Pt = [number, number];

export function roundedCurve(radius: number) {
  return (context: PathCtx) => {
    let pts: Pt[] = [];
    let line: number;

    const render = () => {
      const count = pts.length;
      if (count === 0) return;
      if (line) context.lineTo(pts[0][0], pts[0][1]);
      else context.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < count - 1; i++) {
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        const [cx, cy] = pts[i + 1];
        const inx = bx - ax;
        const iny = by - ay;
        const outx = cx - bx;
        const outy = cy - by;
        const inLen = Math.hypot(inx, iny) || 1;
        const outLen = Math.hypot(outx, outy) || 1;
        const cornerRadius = Math.min(radius, inLen / 2, outLen / 2);
        context.lineTo(bx - (inx / inLen) * cornerRadius, by - (iny / inLen) * cornerRadius);
        context.quadraticCurveTo(
          bx,
          by,
          bx + (outx / outLen) * cornerRadius,
          by + (outy / outLen) * cornerRadius,
        );
      }
      if (count > 1) context.lineTo(pts[count - 1][0], pts[count - 1][1]);
    };

    return {
      areaStart() {
        line = 0;
      },
      areaEnd() {
        line = NaN;
      },
      lineStart() {
        pts = [];
      },
      lineEnd() {
        render();
        if (line || (line !== 0 && pts.length === 1)) context.closePath();
        line = 1 - line;
      },
      point(x: number, y: number) {
        pts.push([+x, +y]);
      },
    };
  };
}
