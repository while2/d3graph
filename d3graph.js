function d3graph (div, width, height, drawNode, drawEdge) {
  let svg = div.append('svg')
  .attr('width', width).attr('height', height);

  let nodes = {};
  let edges = {};
  let history = [];

  function addNode(id, data) {
    if (nodes[id] !== undefined) throw 'Node ' + id + ' already exists';
    nodes[id] = data || id;
  }
  function getNode(id) {
    let node = nodes[id];
    if (node == undefined) throw 'Node ' + id + ' does not exist';
    return node;
  }
  function delNode(nodeId) {
    nodes[nodeId] = undefined;
  }
  function addEdge(edgeId, srcId, dstId, data) {
    edges[edgeId] = {id: edgeId, srcId: srcId, dstId: dstId, data: data};
  }
  function delEdge(edgeId) {
    edges[edgeId] = undefined;
  }

  function buildGraph() {
    let graph = {};
    for (let id in nodes) {
      if (nodes[id] !== undefined) {
        graph[id] = {src:[], dst: []};
      }
    }
    for (let eid in edges) {
      let edge = edges[eid];
      if (graph[edge.srcId] !== undefined && graph[edge.dstId] != undefined) {
        graph[edge.srcId].dst.push(edge);
        graph[edge.dstId].src.push(edge);
      }
    }
    return graph;
  }

  function buildLayers(graph) {
    let queue = [];
    // first layer has no src
    for (let id in graph) {
      if (graph[id].src.length === 0) {
        queue.push(id);
      }
    }
    queue.push(undefined);

    let level = 0;
    while (queue.length > 0) {
      let id = queue.shift();
      if (id === undefined) {
        level++;
        if (queue.length === 0) break;
        queue.push(undefined);
        continue;
      }

      graph[id].level = graph[id].level || level;
      graph[id].dst.forEach(function (edge) {
        queue.push(edge.dstId);
      });
    }
    let layers = [];
    for (let id in graph) {
      let node = graph[id];
      if (layers[node.level] === undefined) {
        layers[node.level] = [];
      }
      layers[node.level].push(id);
    }
    return layers;
  }

  function sortLayers(graph, layers) {
    let round = layers.length;
    while (true) {
      layers.forEach(function (layer) {
        layer.forEach(function (id, index) {
          graph[id].y = (index + 1) / (layer.length + 1);
        });
      });

      if (--round < 0) break;

      layers.forEach(function (layer) {
        layer.forEach(function (id) {
          let node = graph[id];
          let sum = node.y;
          node.src.forEach(function (edge) {
            sum += graph[edge.srcId].y;
          });
          node.dst.forEach(function (edge) {
            sum += graph[edge.dstId].y;
          });
          graph[id].y = sum / (1 + node.src.length + node.dst.length);
        });
        layer = layer.sort(function (id1, id2) {
          return graph[id1].y < graph[id2].y ? -1 : 1;
        });
      });
    }
  }

  function layoutNodes(graph, layers) {
    layers.forEach(function (layer, i) {
      let x = width * (i + 1) / (layers.length + 1);
      layer.forEach(function (id, j) {
        let y = height * (j + 1) / (layer.length + 1);
        graph[id].x = x;
        graph[id].y = y;
      });
    });
  }

  function layoutEdges(graph, layers) {
    let edgeAnchors = {};
    for (let srcId in graph) {
      let srcNode = graph[srcId];
      let edgeGroups = {};
      srcNode.dst.forEach(function (edge) {
        if (edgeGroups[edge.dstId] === undefined) {
          edgeGroups[edge.dstId] = [];
        }
        edgeGroups[edge.dstId].push(edge);
      });

      let srcMargin = 0.5 * height / (layers[srcNode.level].length + 1);

      for (let dstId in edgeGroups) {
        let edges = edgeGroups[dstId];
        edges = edges.sort(function (edge1, edge2) {
          return edge1.id < edge2.id ? -1 : 1;
        });
        let dstNode = graph[dstId];
        if (dstNode.level !== srcNode.level) {
          let dstMargin = 0.5 * height / (layers[dstNode.level].length + 1);
          let top = (srcNode.y - srcMargin + dstNode.y - dstMargin) / 2;
          let bottom = (srcNode.y + srcMargin + dstNode.y + dstMargin) / 2;
          let step = (bottom - top) / (edges.length + 1);
          let x = (srcNode.x + dstNode.x) / 2;
          edges.forEach(function (edge, i) {
            let y = (i+1) * step + top;
            edgeAnchors[edge.id] = {x: x, y: y};
          });
        } else {
          // same level, scatter anchors horizontally
          let y = (srcNode.y + dstNode.y) / 2;
          let margin = (0.5 * width / layers.length + 1) * Math.abs(srcNode.y - dstNode.y) / height;
          let left = srcNode.x - margin;
          let right = srcNode.x + margin;
          if (edges.length % 2 === 0) {
            var step = (right - left) / (edges.length - 1);
          } else {
            var step = (right - left) / edges.length;
          }
          edges.forEach(function (edge, i) {
            let x = i * step + left;
            edgeAnchors[edge.id] = {x: x, y: y};
          });
        }
      }
    }
    return edgeAnchors;
  }

  function redraw(duration, ease) {
    svg.selectAll('*').remove();

    let graph = buildGraph();
    let layers = buildLayers(graph);
    sortLayers(graph, layers);
    layoutNodes(graph, layers);
    let anchors = layoutEdges(graph, layers);

    if (duration !== undefined && history.length > 0) {
      ease = ease || 'cos';
      let prevGraph = history.shift();
      let prevAnchors = history.shift();
      renderAnimation(prevGraph, graph, prevAnchors, anchors, duration, ease);
    } else {
      render(graph, anchors);
    }

    let saveGraph = {};
    for (let id in graph) {
      if (graph[id].dummy === undefined) {
        saveGraph[id] = graph[id];
      }
    }
    history.push(saveGraph);
    history.push(anchors);
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
          graph1[id] = {x: parent.x, y: parent.y, dummy: true};
          break;
        }
        graph2[pid].src.forEach(function (edge) {
          queue.push(edge.srcId);
        });
      }
    }
  }

  function render(graph, anchors) {
    for (let id in edges) {
      let edge = edges[id];
      let srcNode = graph[edge.srcId];
      let dstNode = graph[edge.dstId];
      let anchor = anchors[id];
      if (anchor !== undefined) {
        renderEdge([srcNode, anchor, dstNode], edge.data);
      }
    }

    for (let id in graph) {
      renderNode(graph[id], nodes[id]);
    }
  }

  function renderAnimation(prevGraph, graph, prevAnchors, anchors, duration, ease) {
    buildDummyNodes(prevGraph, graph);
    buildDummyNodes(graph, prevGraph);

    for (let id in anchors) {
      let edge = edges[id];
      let path = [graph[edge.srcId], anchors[id], graph[edge.dstId]];

      let prevSrcNode = prevGraph[edge.srcId];
      let prevDstNode = prevGraph[edge.dstId];
      if (prevSrcNode === undefined || prevDstNode === undefined) {
        renderEdge(path, edge.data);
      } else {
        let prevAnchor = prevAnchors[id];
        if (prevAnchor === undefined) {
          prevAnchor = {x: (prevSrcNode.x + prevDstNode.x) / 2, y: (prevSrcNode.y + prevDstNode.y) / 2};
        }
        let prevPath = [prevSrcNode, prevAnchor, prevDstNode];
        renderEdgeAnimation(prevPath, path, edge.data, duration, ease);
      }
    }

    // for vanishing edges
    for (let id in prevAnchors) {
      if (anchors[id] !== undefined) continue;
      let edge = edges[id];
      let srcNode = graph[edge.srcId];
      let dstNode = graph[edge.dstId];
      if (srcNode === undefined || dstNode === undefined) continue;
      let anchor = {x: (srcNode.x + dstNode.x) / 2, y: (srcNode.y + dstNode.y) / 2};
      let path = [srcNode, anchor, dstNode];
      let prevPath = [prevGraph[edge.srcId], prevAnchors[id], prevGraph[edge.dstId]];
      renderEdgeAnimation(prevPath, path, edge.data, duration, ease, true);
    }

    for (let id in graph) {
      let node = graph[id];
      let prevNode = prevGraph[id];

      if (prevNode !== undefined) {
        renderNodeAnimation(prevNode, node, nodes[id], duration, ease);
      } else {
        renderNode(node, nodes[id]);
      }
    }
  }


  function renderNode(node, data) {
    let group = svg.append('g')
    .attr('transform', 'translate(' + node.x + ',' + node.y + ')');
    drawNode(group, data);
  }

  function renderNodeAnimation(node1, node2, data, duration, ease) {
    let group = svg.append('g');
    group.attr('transform', 'translate(' + node1.x + ',' + node1.y + ')')
    drawNode(group, data);
    let animation = group.transition().duration(duration).ease(ease)
    .attr('transform', 'translate(' + node2.x + ',' + node2.y + ')');

    if (node2.dummy) {
      animation.each('end', function () {
        group.remove();
      });
    }
  }

  let lineFunc = d3.svg.line()
  .x(function (d) { return d.x; })
  .y(function (d) { return d.y; })
  .interpolate('basis');

  function renderEdge(anchors, data) {
    let mid = anchors[Math.floor(anchors.length / 2)];
    let path = svg.append('path')
    .attr('d', lineFunc(anchors)).attr('fill', 'none');
    let group = svg.append('g')
    .attr('transform', 'translate(' + mid.x + ',' + mid.y + ')');
    drawEdge(path, group, data);
  }

  function renderEdgeAnimation(anchors1, anchors2, data, duration, ease, dummy) {
    let path = svg.append('path').attr('fill', 'none');
    path.attr('d', lineFunc(anchors1));
    path.transition().duration(duration).ease(ease)
    .attr('d', lineFunc(anchors2));

    let mid1 = anchors1[Math.floor(anchors1.length / 2)];
    let mid2 = anchors2[Math.floor(anchors2.length / 2)];

    let group = svg.append('g');
    group.attr('transform', 'translate(' + mid1.x + ',' + mid1.y + ')');
    drawEdge(path, group, data);
    let animation = group.transition().duration(duration).ease(ease)
    .attr('transform', 'translate(' + mid2.x + ',' + mid2.y + ')');
    if (dummy) {
      animation.each('end', function () {
        path.remove();
        group.remove();
      });
    }
  }

  return {
    addNode: addNode,
    delNode: delNode,
    addEdge: addEdge,
    delEdge: delEdge,
    redraw: redraw,
    nodes: nodes,
    edges: edges
  };
}
