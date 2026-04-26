
import { Vector3 } from 'three';

export class SpatialHashGrid {
  private cells: Map<string, number[]>;
  private cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  // Generate a key for the map based on coordinates
  private getKey(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }

  // Clear the grid (call every frame before populating)
  clear() {
    this.cells.clear();
  }

  // Add an entity ID to the grid
  add(id: number, x: number, z: number) {
    const key = this.getKey(x, z);
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key)!.push(id);
  }

  // Get all entity IDs in the same cell and neighboring cells
  // Returns an array of IDs
  query(x: number, z: number): number[] {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const results: number[] = [];

    // Check 3x3 grid around the point
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const key = `${cx + i},${cz + j}`;
        const cell = this.cells.get(key);
        if (cell) {
          // We assume the number of entities in a 3x3 area is small enough
          // that concatenating arrays is faster than set operations
          for(let k=0; k<cell.length; k++) {
              results.push(cell[k]);
          }
        }
      }
    }
    return results;
  }
}
