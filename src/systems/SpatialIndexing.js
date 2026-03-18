/**
 * Simple QuadTree implementation for spatial plot lookup
 */
class QuadTree {
  constructor(boundary, capacity) {
    this.boundary = boundary // { x, z, w, h }
    this.capacity = capacity
    this.points = []
    this.divided = false
  }

  subdivide() {
    const { x, z, w, h } = this.boundary
    const hw = w / 2
    const hh = h / 2

    this.northeast = new QuadTree({ x: x + hw, z: z - hh, w: hw, h: hh }, this.capacity)
    this.northwest = new QuadTree({ x: x - hw, z: z - hh, w: hw, h: hh }, this.capacity)
    this.southeast = new QuadTree({ x: x + hw, z: z + hh, w: hw, h: hh }, this.capacity)
    this.southwest = new QuadTree({ x: x - hw, z: z + hh, w: hw, h: hh }, this.capacity)

    this.divided = true
  }

  insert(point) {
    if (!this.contains(point)) return false

    if (this.points.length < this.capacity) {
      this.points.push(point)
      return true
    }

    if (!this.divided) {
      this.subdivide()
    }

    return (
      this.northeast.insert(point) ||
      this.northwest.insert(point) ||
      this.southeast.insert(point) ||
      this.southwest.insert(point)
    )
  }

  contains(point) {
    const { x, z, w, h } = this.boundary
    return (
      point.x >= x - w &&
      point.x <= x + w &&
      point.z >= z - h &&
      point.z <= z + h
    )
  }

  query(range, found) {
    if (!found) found = []
    if (!this.intersects(range)) return found

    for (let p of this.points) {
      if (range.contains(p)) {
        found.push(p)
      }
    }

    if (this.divided) {
      this.northwest.query(range, found)
      this.northeast.query(range, found)
      this.southwest.query(range, found)
      this.southeast.query(range, found)
    }

    return found
  }

  intersects(range) {
    return !(
      range.x - range.w > this.boundary.x + this.boundary.w ||
      range.x + range.w < this.boundary.x - this.boundary.w ||
      range.z - range.h > this.boundary.z + this.boundary.h ||
      range.z + range.h < this.boundary.z - this.boundary.h
    )
  }
}

export default QuadTree
