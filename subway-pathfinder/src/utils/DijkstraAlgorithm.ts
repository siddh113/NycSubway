import { Station, Connection } from '../data/SubwayData';

export interface DijkstraNode {
  id: string;
  distance: number;
  previous: string | null;
  previousLine: string | null;
  visited: boolean;
}

export interface PathSegment {
  from: Station;
  to: Station;
  line: string;
  time: number;
}

export interface PathResult {
  path: PathSegment[];
  totalTime: number;
  totalWaitTime: number;
  totalTravelTime: number;
  transfers: number;
}

/**
 * Finds the shortest path between two subway stations using Dijkstra's algorithm
 * This implementation considers both travel time between stations and wait time when transferring lines
 * 
 * @param stations - List of all stations in the network
 * @param connections - List of all connections between stations
 * @param startId - ID of the starting station
 * @param endId - ID of the destination station
 * @returns Path result with segments, times, and transfer information
 */
export const findShortestPath = (
  stations: Station[],
  connections: Connection[],
  startId: string,
  endId: string
): PathResult => {
  // Handle edge case when start and end are the same
  if (startId === endId) {
    return {
      path: [],
      totalTime: 0,
      totalWaitTime: 0,
      totalTravelTime: 0,
      transfers: 0
    };
  }

  // Create a map of station id to station object for easy lookup
  const stationMap = new Map<string, Station>();
  stations.forEach(station => {
    stationMap.set(station.id, station);
  });

  // Initialize the graph with all stations
  const graph = new Map<string, DijkstraNode>();
  stations.forEach(station => {
    graph.set(station.id, {
      id: station.id,
      distance: station.id === startId ? 0 : Infinity,
      previous: null,
      previousLine: null,
      visited: false
    });
  });

  // Create an adjacency list for faster lookup
  const adjacencyList = new Map<string, { neighbor: string; line: string; time: number }[]>();
  stations.forEach(station => {
    adjacencyList.set(station.id, []);
  });

  connections.forEach(connection => {
    const neighbors = adjacencyList.get(connection.from) || [];
    neighbors.push({
      neighbor: connection.to,
      line: connection.line,
      time: connection.time
    });
    adjacencyList.set(connection.from, neighbors);
  });

  // Use a priority queue to always process the node with the smallest distance next
  const unvisited = new Set<string>(stations.map(s => s.id));
  
  // Process nodes until we reach the destination or exhaust all options
  while (unvisited.size > 0) {
    // Find the unvisited node with the smallest distance
    let currentId: string | null = null;
    let smallestDistance = Infinity;
    
    for (const nodeId of unvisited) {
      const node = graph.get(nodeId);
      if (node && node.distance < smallestDistance) {
        smallestDistance = node.distance;
        currentId = nodeId;
      }
    }
    
    // If we can't find a node or the smallest distance is infinity, 
    // there's no path to the destination
    if (!currentId || smallestDistance === Infinity) {
      break;
    }
    
    // If we reached the end node, we're done
    if (currentId === endId) {
      break;
    }
    
    // Remove from unvisited
    unvisited.delete(currentId);
    
    // Mark the current node as visited
    const node = graph.get(currentId);
    if (!node) continue;
    node.visited = true;
    
    // Process each neighbor
    const neighbors = adjacencyList.get(currentId) || [];
    neighbors.forEach(({ neighbor, line, time }) => {
      const neighborNode = graph.get(neighbor);
      if (!neighborNode || neighborNode.visited) return;
      
      const station = stationMap.get(neighbor);
      if (!station) return;
      
      // Calculate wait time when changing lines
      let waitTime = 0;
      if (node.previousLine && node.previousLine !== line) {
        waitTime = station.waitTime;
      }
      
      const totalTime = node.distance + time + waitTime;
      
      // If this path is shorter, update the neighbor
      if (totalTime < neighborNode.distance) {
        neighborNode.distance = totalTime;
        neighborNode.previous = currentId;
        neighborNode.previousLine = line;
      }
    });
  }

  // Reconstruct the path
  const path: PathSegment[] = [];
  let current = endId;
  let totalWaitTime = 0;
  let totalTravelTime = 0;
  let transfers = 0;
  let previousLine: string | null = null;
  
  while (current !== startId) {
    const node = graph.get(current);
    if (!node || !node.previous || !node.previousLine) break;
    
    const fromStation = stationMap.get(node.previous);
    const toStation = stationMap.get(current);
    
    if (!fromStation || !toStation) break;
    
    // Find the connection between these stations
    const connection = connections.find(
      conn => conn.from === node.previous && conn.to === current && conn.line === node.previousLine
    );
    
    if (!connection) break;
    
    // Calculate transfer and wait time
    if (previousLine && previousLine !== node.previousLine) {
      transfers++;
      totalWaitTime += toStation.waitTime;
    }
    
    totalTravelTime += connection.time;
    previousLine = node.previousLine;
    
    path.unshift({
      from: fromStation,
      to: toStation,
      line: connection.line,
      time: connection.time
    });
    
    current = node.previous;
  }
  
  // Calculate the total time (travel + wait)
  const totalTime = totalTravelTime + totalWaitTime;
  
  return {
    path,
    totalTime,
    totalWaitTime,
    totalTravelTime,
    transfers
  };
}; 