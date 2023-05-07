import { euclidean_distance, Vector3 } from "../util/math.js";
import { DefaultDict } from "../util/defaultDict.js";
import { includesArray } from "../util/includesArray.js";
import { PriorityQueue } from "../util/priorityQueue.js";
import { TileSet } from "./tileSet.js";

// Hear me, all Subjects of Ymir;
export class Paths {
  constructor(map)
  {
    this.map = map;
    this.nodes = [];
    this.generateNodes();
  }

  lineOfSight(pos1, pos2) {
    const posVector = new Vector3(pos1[0] + 0.5, pos1[1]  + 0.5, 0);
    const dirVector = new Vector3(pos2[0]-pos1[0], pos2[1]-pos1[1], 0).normalize();
    const rayHit = this.map.rayCast(posVector, dirVector, TileSet.SOLID_FLAG);
    return rayHit.dist >= euclidean_distance(pos1, pos2);
  }

  getNeighbourNodes(pos, nodes) {
    const neighbourNodes = nodes.filter(
      (node) => this.lineOfSight(pos, node) &&
      !(node.every((v,i) => v === pos))
    ) 
    return neighbourNodes;
  }

  thetaStar(startVec, goalVec) {
    const start = [
      Math.floor(startVec.x),
      Math.floor(startVec.y)
    ];
    const goal = [
      Math.floor(goalVec.x),
      Math.floor(goalVec.y)
    ]

    // Priority queue means nodes are evaluated from best to worst cost
    let openSet = new PriorityQueue((a, b) => a[1] < b[1]);
    let closedSet = [];
    let parent = new DefaultDict(null);

    // gScore[n] = shortest distance from start to n
    let gScore = new DefaultDict(Infinity); 
    
    gScore[start] = 0;
    parent[start] = start;
    openSet.push([start, 0])

    while (!openSet.isEmpty()) {
      let [current, cost] = openSet.pop();
      
      // Reconstruct path when at goal
      if (current.every((v, i) => v === goal[i])) { //a1.every((v,i)=> v === a2[i]);
        let totalPath = [];
        while (!(current.every((v, i) => v === start[i]))){
          totalPath.push(current);
          current = parent[current];
        }       
        return totalPath.reverse()
      }
      
      // Process each node only once.
      closedSet.push(current)

      // Calculate cost of pathing to neighbouring nodes and place result into priorityqueue
      for (const neighbour of this.getNeighbourNodes(current, this.nodes.concat([goal]))) {
        if (!includesArray(closedSet, neighbour)) {
          const currentParent = parent[current];
          if (this.lineOfSight(currentParent, neighbour)) {
            const pathCost = gScore[currentParent] + euclidean_distance(currentParent, neighbour);
            if (pathCost < gScore[neighbour]) {
              gScore[neighbour] = pathCost;
              parent[neighbour] = currentParent;
              openSet.push([neighbour, gScore[neighbour] + euclidean_distance(neighbour, goal)]);
            }
          }
          else {
            const pathCost = gScore[current] + euclidean_distance(current, neighbour);
            if (pathCost < gScore[neighbour]) {
              gScore[neighbour] = pathCost;
              parent[neighbour] = current;
              openSet.push([neighbour, gScore[neighbour] + euclidean_distance(neighbour, goal)]);
            }
          }
        }
      }
    }

    return null;
  }

  generateNodes()
  {
    this.nodes = [];
    
    for (let x = 1; x < this.map.width - 1; x++) {
      for (let y = 1; y < this.map.height - 1; y++) {
        if (this.map.isSolid(x, y) && this.map.isCorner(x, y)) {
          if (!this.map.isSolid(x+1, y+1))
            this.nodes.push([x+1,y+1]);
          if (!this.map.isSolid(x+1, y-1))
            this.nodes.push([x+1,y-1]);
          if (!this.map.isSolid(x-1, y+1))
            this.nodes.push([x-1,y+1]);
          if (!this.map.isSolid(x-1, y-1))
            this.nodes.push([x-1,y-1]);
        }
      }
    }
  }  
};
