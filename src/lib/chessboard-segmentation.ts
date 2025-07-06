interface Point {
  x: number;
  y: number;
}

interface ChessSquare {
  id: number;
  square: {
    row: number;
    col: number;
  };
  corners: {
    topLeft: Point;
    topRight: Point;
    bottomRight: Point;
    bottomLeft: Point;
  };
}

interface ChessboardSegmentation {
  squares: ChessSquare[];
  boardCorners: Point[];
}

/**
 * Orders corners in a consistent manner: top-left, top-right, bottom-right, bottom-left
 */
function orderCorners(corners: Point[]): Point[] {
  if (corners.length !== 4) {
    throw new Error('Exactly 4 corners are required');
  }

  const sortedByY = [...corners].sort((a, b) => a.y - b.y);
  const topPoints = sortedByY.slice(0, 2);
  const bottomPoints = sortedByY.slice(2, 4);
  topPoints.sort((a, b) => a.x - b.x);
  bottomPoints.sort((a, b) => a.x - b.x);
  
  return [
    topPoints[0],    // top-left
    topPoints[1],    // top-right
    bottomPoints[1], // bottom-right
    bottomPoints[0]  // bottom-left
  ];
}

/**
 * Performs perspective transformation using matrix mathematics
 */
function perspectiveTransform(point: Point, matrix: number[][]): Point {
  const [x, y] = [point.x, point.y];
  const w = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2];
  
  return {
    x: (matrix[0][0] * x + matrix[0][1] * y + matrix[0][2]) / w,
    y: (matrix[1][0] * x + matrix[1][1] * y + matrix[1][2]) / w
  };
}

/**
 * Calculates the perspective transformation matrix from source to destination points
 */
function getPerspectiveTransform(src: Point[], dst: Point[]): number[][] {
  if (src.length !== 4 || dst.length !== 4) {
    throw new Error('Both source and destination must have exactly 4 points');
  }

  // Set up the system of equations for perspective transformation
  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = src[i];
    const { x: dx, y: dy } = dst[i];

    // For x coordinate
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    B.push(dx);

    // For y coordinate
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    B.push(dy);
  }

  // Solve the system using Gaussian elimination
  const h = gaussianElimination(A, B);
  
  // Reshape into 3x3 matrix
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1]
  ];
}

/**
 * Solves a system of linear equations using Gaussian elimination
 */
function gaussianElimination(A: number[][], B: number[]): number[] {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, B[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    
    // Swap rows
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Make all rows below this one 0 in current column
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j < n + 1; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }

  return x;
}

/**
 * Inverts a 3x3 matrix
 */
function invertMatrix(matrix: number[][]): number[][] {
  const [[a, b, c], [d, e, f], [g, h, i]] = matrix;
  
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  
  if (Math.abs(det) < 1e-10) {
    throw new Error('Matrix is singular and cannot be inverted');
  }
  
  return [
    [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det]
  ];
}

/**
 * Segments a chessboard given 4 corner points
 */
export function segmentChessboard(corners: Point[]): ChessboardSegmentation {
  const orderedCorners = orderCorners(corners);
  const squareSize = 1000;
  const boardSize = 8 * squareSize;
  
  // Define destination points for a perfect square board
  const dstPoints: Point[] = [
    { x: 0, y: 0 },                    // top-left
    { x: boardSize, y: 0 },            // top-right
    { x: boardSize, y: boardSize },    // bottom-right
    { x: 0, y: boardSize }             // bottom-left
  ];
  
  // Calculate perspective transformation matrix
  const perspectiveMatrix = getPerspectiveTransform(orderedCorners, dstPoints);
  const inverseMatrix = invertMatrix(perspectiveMatrix);
  
  const squares: ChessSquare[] = [];
  
  // Generate all 64 chess squares
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const index = row * 8 + col;
      const minX = col * squareSize;
      const minY = row * squareSize;
      
      // Define square corners in the normalized board space
      const boardCorners: Point[] = [
        { x: minX, y: minY },                                    // top-left
        { x: minX + squareSize, y: minY },                      // top-right
        { x: minX + squareSize, y: minY + squareSize },         // bottom-right
        { x: minX, y: minY + squareSize }                       // bottom-left
      ];
      
      // Transform back to image coordinates
      const imageCorners = boardCorners.map(corner => 
        perspectiveTransform(corner, inverseMatrix)
      );
      
      squares.push({
        id: index,
        square: {
          row: row,
          col: col
        },
        corners: {
          topLeft: imageCorners[0],
          topRight: imageCorners[1],
          bottomRight: imageCorners[2],
          bottomLeft: imageCorners[3]
        }
      });
    }
  }
  
  return {
    squares,
    boardCorners: orderedCorners
  };
}

/**
 * Validates if the given corners form a reasonable chessboard shape
 */
export function validateChessboardCorners(corners: Point[]): boolean {
  if (corners.length !== 4) return false;
  
  const orderedCorners = orderCorners(corners);
  
  // Check if the quadrilateral is convex
  function crossProduct(o: Point, a: Point, b: Point): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }
  
  const signs: number[] = [];
  for (let i = 0; i < 4; i++) {
    const o = orderedCorners[i];
    const a = orderedCorners[(i + 1) % 4];
    const b = orderedCorners[(i + 2) % 4];
    signs.push(Math.sign(crossProduct(o, a, b)));
  }
  
  // All cross products should have the same sign for a convex quadrilateral
  const allSameSign = signs.every(sign => sign === signs[0]);
  
  return allSameSign;
}

// Example usage:
/*
const corners = [
  { x: 100, y: 100 },   // top-left
  { x: 500, y: 120 },   // top-right
  { x: 480, y: 520 },   // bottom-right
  { x: 80, y: 500 }     // bottom-left
];

const result = segmentChessboard(corners);
// Now each square will have:
// - square.row: 0-7 (0 = top row, 7 = bottom row)
// - square.col: 0-7 (0 = leftmost column, 7 = rightmost column)
*/