///<reference path="pqueue.ts"/>
module ShortestPaths {
    export declare class Edge {
        source: number;
        target: number;
        length: number;
    }

    export function dijkstra(n: number, es: Edge[], start: number): number[] {
        var d = new Array(n);
        dijkstraNeighbours(getNeighbours(n, es), start, d);
        return d;
    }

    export function johnsons(n: number, es: Edge[]): number[][] {
        var D = new Array(n);
        var N = getNeighbours(n, es);
        for (var i = 0; i < n; ++i) {
            var d = D[i] = new Array(n);
            dijkstraNeighbours(N, i, d);
        }
        return D;
    }

    class Neighbour {
        constructor(id: number, distance: number) {
            this.id = id;
            this.distance = distance;
        }
        id: number;
        distance: number;
    }

    class Node {
        constructor(id: number) {
            this.id = id;
            this.neighbours = [];
        }
        id: number;
        neighbours: Neighbour[];
        d: number;
        q: PairingHeap<Node>;
    }

    function getNeighbours(n: number, es: Edge[]): Node[] {
        var neighbours = new Array(n);
        var i = n; while (i--) neighbours[i] = new Node(i);

        i = es.length; while (i--) {
            var e = es[i];
            var u: number = e.source, v: number = e.target;
            var d = typeof e.length !== 'undefined' ? e.length : 1;
            neighbours[u].neighbours.push(new Neighbour(v, d));
            neighbours[v].neighbours.push(new Neighbour(u, d));
        }
        return neighbours;
    };

    function dijkstraNeighbours(neighbours: Node[], start: number, d: number[]): void {
        var q = new PriorityQueue<Node>((a, b)=> a.d <= b.d);
        var i = neighbours.length; while (i--) {
            var node: Node = neighbours[i];
            node.d = i === start ? 0 : Number.MAX_VALUE;
            node.q = q.push(node);
        }
        while (!q.empty()) {
            // console.log(q.toString(function (u) { return u.id + "=" + (u.d === Number.MAX_VALUE ? "\u221E" : u.d) }));
            var u = q.pop();
            d[u.id] = u.d;
            i = u.neighbours.length; while (i--) {
                var neighbour = u.neighbours[i];
                var v = neighbours[neighbour.id];
                var t = u.d + neighbour.distance;
                if (u.d !== Number.MAX_VALUE && v.d > t) {
                    v.d = t;
                    v.q = q.reduceKey(v.q, v);
                }
            }
        }
    };
}