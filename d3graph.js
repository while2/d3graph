function d3graph (div, width, height, drawNode, drawEdge) {
  let svg = div.append('svg')
  .attr('width', width).attr('height', height);

  let nodes = {};
  let edges = {};
  let graphQueue = [];

  function addNode(id, data) {
    if (nodes[id] !== undefined) throw 'Node ' + id + ' already exists';
    nodes[id] = data;
  }
  function getNode(id) {
    let node = nodes[id];
    if (node == undefined) throw 'Node ' + id + ' does not exist';
    return node;
  }
  function delNode(nodeId) {
    node_map[nodeId] = undefined;
  }
  function addEdge(edgeId, srcId, dstId, data) {
    edges[edgeId] = {id: edgeId, srcId: srcId, dstId: dstId, data: data};
  }
  function delEdge(edgeId) {
    edges[edgeId] = undefined;
  }

  function buildGraph() {
    let graph = {};
    for (let eid in edges) {
      let edge = edges[eid];
      if (nodes[edge.srcId] === undefined || nodes[edge.dstId] === undefined) {
        continue;
      }
      if (graph[edge.srcId] === undefined) {
        graph[edge.srcId] = {src:[], dst: [], data: nodes[edge.srcId]};
      }
      if (graph[edge.dstId] === undefined) {
        graph[edge.dstId] = {src:[], dst: [], data: nodes[edge.dstId]};
      }
      graph[edge.srcId].dst.push(edge);
      graph[edge.dstId].src.push(edge);
    }
    return graph;
  }

  function buildLayers(graph) {
    // first layer has no src
    let layer = [];
    for (let id in graph) {
      if (graph[id].src.length === 0) {
        graph[id].level = 0;
        layer.push(id);
      }
    }

    let layers = [layer];
    for (let l = 1; ; l++) {
      layer = layer.map(function (id) {
        return graph[id].dst.map(function (edge) {
          return edge.dstId;
        });
      })
      .reduce(function (set1, set2) {
        set2.forEach(function (id) {
          if (graph[id].level === undefined) {
            graph[id].level = l
            set1.push(id);
          }
        })
        return set1;
      }, []);
      if (layer.length > 0) {
        layers.push(layer);
      } else {
        break;
      }
    }
    return layers;
  }

  function sortLayers(graph, layers) {
    for (let round = 0; round < layers.length; ++round) {
      layers.forEach(function (layer) {
        layer.forEach(function (id, index) {
          graph[id].y = (index + 1) / layer.length + 1;
        });
      });

      layers.forEach(function (layer) {
        layer.forEach(function (id) {
          let node = graph[id];
          let sum = 0.0;
          node.src.forEach(function (edge) {
            sum += graph[edge.dstId].y;
          });
          node.dst.forEach(function (edge) {
            sum += graph[edge.srcId].y;
          });
          graph[id].y = sum / (node.src.length + node.dst.length);
        });
        layer = layer.sort(function (id1, id2) {
          return graph[id1].y - graph[id2].y;
        });
      });
    }
  }

  function layoutLayers(graph, layers) {
    layers.forEach(function (layer, i) {
      let x = width * (i + 1) / (layers.length + 1);
      layer.forEach(function (id, j) {
        let y = height * (j + 1) / (layer.length + 1);
        graph[id].x = x;
        graph[id].y = y;
      });
    });
  }

  function redraw() {
    svg.selectAll('*').remove();

    let graph = buildGraph();
    let layers = buildLayers(graph);
    sortLayers(graph, layers);
    layoutLayers(graph, layers);

    if (graphQueue.length > 0) {
      let prevGraph = graphQueue.shift();
      renderAnimation(prevGraph, graph, 1000, 'cos');
    } else {
      render(graph);
    }
    graphQueue.push(graph);
  }

  function buildEdgeAnchors(srcNode, dstNode, edges) {
    let step = (dstNode.y - srcNode.y) / (edges.length + 1);
    let x = (srcNode.x + dstNode.x) / 2;
    return edges.map(function (edge, i) {
      let y = (i+1) * step + srcNode.y;
      return [srcNode, {x: x, y: y}, dstNode];
    });
  }

  function render(graph) {
    renderAnimation(graph, graph, 0, 'cos');
  }

  function buildDummyNodes(graph1, graph2) {
    for (let id in graph2) {
      if (graph1[id] !== undefined) continue;
      let node = graph2[id];
      // fill graph1[id] with nearest parent
      let queue = [id];
      while (queue.length > 0) {
        let pid = queue.shift();
        let parent = graph1[pid];
        if (parent !== undefined) {
          graph1[id] = {x: parent.x, y: parent.y, src: node.src, dst: node.dst};
          break;
        }
        graph2[pid].src.forEach(function (edge) {
          queue.push(edge.srcId);
        });
      }
    }
  }

  function renderAnimation(prevGraph, graph, duration, ease) {
    buildDummyNodes(prevGraph, graph);
    buildDummyNodes(graph, prevGraph);

    for (let srcId in graph) {
      let srcNode = graph[srcId];
      let prevSrcNode = prevGraph[srcId];

      let edgeGroups = {};
      srcNode.dst.forEach(function (edge) {
        if (edgeGroups[edge.dstId] === undefined) {
          edgeGroups[edge.dstId] = [];
        }
        edgeGroups[edge.dstId].push(edge);
      });

      for (let dstId in edgeGroups) {
        let dstNode = graph[dstId];
        let prevDstNode = prevGraph[dstId];
        let edges = edgeGroups[dstId];
        let prevAnchors = buildEdgeAnchors(prevSrcNode, prevDstNode, edges);
        let anchors = buildEdgeAnchors(srcNode, dstNode, edges);
        for (let i in edges) {
          renderEdgeAnimation(prevAnchors[i], anchors[i], edges[i].data, duration, ease);
        }
      }

      renderNodeAnimation(prevGraph[srcId], srcNode, duration, ease);
    }
  }

  function renderNode(node) {
    let group = svg.append('g')
    .attr('transform', 'translate(' + node.x + ',' + node.y + ')');
    drawNode(group, node.data);
  }

  function renderNodeAnimation(node1, node2, duration, ease) {
    let group = svg.append('g');
    group.attr('transform', 'translate(' + node1.x + ',' + node1.y + ')')
    group.transition().duration(duration).ease(ease)
    .attr('transform', 'translate(' + node2.x + ',' + node2.y + ')');
    drawNode(group, node2.data);
  }

  let lineFunc = d3.svg.line()
  .x(function (d) { return d.x; })
  .y(function (d) { return d.y; })
  .interpolate('monotone');

  function renderEdge(anchors, data) {
    let mid = anchors[Math.floor(anchors.length / 2)];
    let path = svg.append('path')
    .attr('d', lineFunc(anchors)).attr('fill', 'none');
    let group = svg.append('g')
    .attr('transform', 'translate(' + mid.x + ',' + mid.y + ')');
    drawEdge(path, group, data);
  }

  function renderEdgeAnimation(anchors1, anchors2, data, duration, ease) {
    let path = svg.append('path').attr('fill', 'none');
    path.attr('d', lineFunc(anchors1));
    path.transition().duration(duration).ease(ease)
    .attr('d', lineFunc(anchors2));

    let mid1 = anchors1[Math.floor(anchors1.length / 2)];
    let mid2 = anchors2[Math.floor(anchors2.length / 2)];

    let group = svg.append('g');
    group.attr('transform', 'translate(' + mid1.x + ',' + mid1.y + ')');
    group.transition().duration(duration).ease(ease)
    .attr('transform', 'translate(' + mid2.x + ',' + mid2.y + ')');

    drawEdge(path, group, data);
  }

  return {
    addNode: addNode,
    addEdge: addEdge,
    redraw: redraw
  };
}
