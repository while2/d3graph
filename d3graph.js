function d3graph (div, width, height, drawNode, drawEdge) {
  var svg = div.append('svg')
  .attr('width', width).attr('height', height);

  var nodes = {};
  var edges = {};
  var history = [];

  function addNode(id, data) {
    nodes[id] = data || id;
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
    var graph = {};
    for (var id in nodes) {
      if (nodes[id] !== undefined) {
        graph[id] = {src:[], dst: []};
      }
    }
    for (var eid in edges) {
      var edge = edges[eid];
      if (graph[edge.srcId] !== undefined && graph[edge.dstId] != undefined) {
        graph[edge.srcId].dst.push(edge);
        graph[edge.dstId].src.push(edge);
      }
    }
    return graph;
  }

  function buildLayers(graph) {
    var layer = [];
    // first layer has no src
    for (var id in graph) {
      if (graph[id].src.length === 0) {
        graph[id].level = 0;
        layer.push(id);
      }
    }

    var layers = [layer];
    for (var l = 1; layer.length > 0; l++) {
      layer = layer.map(function (id) {
        return graph[id].dst.map(function (edge) {
          return edge.dstId;
        });
      })
      .reduce(function (set1, set2) {
        set2.forEach(function (id) {
          if (graph[id].level === undefined) {
            graph[id].level = l;
            set1.push(id);
          }
        })
        return set1;
      }, []);
      if (layer.length > 0) {
        layers.push(layer);
      }
    }

    return layers;
  }

  function sortLayers(graph, layers) {
    var round = layers.length * 2;
    while (true) {
      layers.forEach(function (layer) {
        layer.forEach(function (id, index) {
          graph[id].y = (index + 1) / (layer.length + 1);
        });
      });

      if (--round < 0) break;

      layers.forEach(function (layer) {
        layer.forEach(function (id) {
          var node = graph[id];
          var sum = node.y;
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
      var x = width * (i + 1) / (layers.length + 1);
      layer.forEach(function (id, j) {
        var y = height * (j + 1) / (layer.length + 1);
        graph[id].x = x;
        graph[id].y = y;
      });
    });
  }

  function layoutEdges(graph, layers) {
    var edgeAnchors = {};
    for (var srcId in graph) {
      var srcNode = graph[srcId];
      var edgeGroups = {};
      srcNode.dst.forEach(function (edge) {
        if (edgeGroups[edge.dstId] === undefined) {
          edgeGroups[edge.dstId] = [];
        }
        edgeGroups[edge.dstId].push(edge);
      });

      var srcMargin = 0.5 * height / (layers[srcNode.level].length + 1);

      for (var dstId in edgeGroups) {
        var edges = edgeGroups[dstId];
        edges = edges.sort(function (edge1, edge2) {
          return edge1.id < edge2.id ? -1 : 1;
        });
        var dstNode = graph[dstId];
        if (dstNode.level !== srcNode.level) {
          var dstMargin = 0.5 * height / (layers[dstNode.level].length + 1);
          var top = (srcNode.y - srcMargin + dstNode.y - dstMargin) / 2;
          var bottom = (srcNode.y + srcMargin + dstNode.y + dstMargin) / 2;
          var step = (bottom - top) / (edges.length + 1);
          var x = (srcNode.x + dstNode.x) / 2;
          edges.forEach(function (edge, i) {
            var y = (i+1) * step + top;
            edgeAnchors[edge.id] = {x: x, y: y};
          });
        } else {
          // same level, scatter anchors horizontally
          var y = (srcNode.y + dstNode.y) / 2;
          var margin = (0.5 * width / layers.length + 1) * Math.abs(srcNode.y - dstNode.y) / height;
          var left = srcNode.x - margin;
          var right = srcNode.x + margin;
          if (edges.length % 2 === 0) {
            var step = (right - left) / (edges.length - 1);
          } else {
            var step = (right - left) / edges.length;
          }
          edges.forEach(function (edge, i) {
            var x = i * step + left;
            edgeAnchors[edge.id] = {x: x, y: y};
          });
        }
      }
    }
    return edgeAnchors;
  }

  var playing = false;
  function redraw(duration, ease) {
    var graph = buildGraph();
    var layers = buildLayers(graph);
    sortLayers(graph, layers);
    layoutNodes(graph, layers);
    var anchors = layoutEdges(graph, layers);

    if (duration === undefined || history.length === 0) {
      // render current state and clear history
      render(graph, anchors);
      history = [graph, anchors];
      playing = false;
      return;
    }

    history.push(duration);
    history.push(ease || 'cos');
    history.push(graph);
    history.push(anchors);
    play();
  }

  function play() {
    if (!playing && history.length > 2) {
      playing = true;
      [prevGraph, prevAnchors, duration, ease] = history.splice(0, 4);
      [graph, anchors] = history.slice(0, 2);

      // copy graph so the origin one would not contain dummy nodes
      var copyGraph = {};
      for (var id in graph) {
        copyGraph[id] = graph[id];
      }

      renderAnimation(prevGraph, copyGraph, prevAnchors, anchors, duration, ease);
      setTimeout(function() {
        playing = false;
        play();
      }, duration);
    }
  }

  function buildDummyNodes(graph1, graph2) {
    for (var id in graph2) {
      if (graph1[id] !== undefined) continue;
      var node = graph2[id];
      // fill graph1[id] with nearest parent
      var queue = [id];
      while (queue.length > 0) {
        var pid = queue.shift();
        var parent = graph1[pid];
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
    svg.selectAll('*').remove();

    for (var id in edges) {
      var edge = edges[id];
      var srcNode = graph[edge.srcId];
      var dstNode = graph[edge.dstId];
      var anchor = anchors[id];
      if (anchor !== undefined) {
        renderEdge([srcNode, anchor, dstNode], edge.data);
      }
    }

    for (var id in graph) {
      renderNode(graph[id], nodes[id]);
    }
  }

  function renderAnimation(prevGraph, graph, prevAnchors, anchors, duration, ease) {
    svg.selectAll('*').remove();

    buildDummyNodes(prevGraph, graph);
    buildDummyNodes(graph, prevGraph);

    for (var id in anchors) {
      var edge = edges[id];
      var path = [graph[edge.srcId], anchors[id], graph[edge.dstId]];

      var prevSrcNode = prevGraph[edge.srcId];
      var prevDstNode = prevGraph[edge.dstId];
      if (prevSrcNode === undefined || prevDstNode === undefined) {
        renderEdge(path, edge.data);
      } else {
        var prevAnchor = prevAnchors[id];
        if (prevAnchor === undefined) {
          prevAnchor = {x: (prevSrcNode.x + prevDstNode.x) / 2, y: (prevSrcNode.y + prevDstNode.y) / 2};
        }
        var prevPath = [prevSrcNode, prevAnchor, prevDstNode];
        renderEdgeAnimation(prevPath, path, edge.data, duration, ease);
      }
    }

    // for vanishing edges
    for (var id in prevAnchors) {
      if (anchors[id] !== undefined) continue;
      var edge = edges[id];
      var srcNode = graph[edge.srcId];
      var dstNode = graph[edge.dstId];
      if (srcNode === undefined || dstNode === undefined) continue;
      var anchor = {x: (srcNode.x + dstNode.x) / 2, y: (srcNode.y + dstNode.y) / 2};
      var path = [srcNode, anchor, dstNode];
      var prevPath = [prevGraph[edge.srcId], prevAnchors[id], prevGraph[edge.dstId]];
      renderEdgeAnimation(prevPath, path, edge.data, duration, ease, true);
    }

    for (var id in graph) {
      var node = graph[id];
      var prevNode = prevGraph[id];

      if (prevNode !== undefined) {
        renderNodeAnimation(prevNode, node, nodes[id], duration, ease);
      } else {
        renderNode(node, nodes[id]);
      }
    }
  }


  function renderNode(node, data) {
    var group = svg.append('g')
    .attr('transform', 'translate(' + node.x + ',' + node.y + ')');
    drawNode(group, data);
  }

  function renderNodeAnimation(node1, node2, data, duration, ease) {
    var group = svg.append('g');
    group.attr('transform', 'translate(' + node1.x + ',' + node1.y + ')')
    drawNode(group, data);
    var animation = group.transition().duration(duration).ease(ease)
    .attr('transform', 'translate(' + node2.x + ',' + node2.y + ')');

    if (node2.dummy) {
      animation.each('end', function () {
        group.remove();
      });
    }
  }

  var lineFunc = d3.svg.line()
  .x(function (d) { return d.x; })
  .y(function (d) { return d.y; })
  .interpolate('basis');

  function renderEdge(anchors, data) {
    var mid = anchors[Math.floor(anchors.length / 2)];
    var path = svg.append('path')
    .attr('d', lineFunc(anchors)).attr('fill', 'none');
    var group = svg.append('g')
    .attr('transform', 'translate(' + mid.x + ',' + mid.y + ')');
    drawEdge(path, group, data);
  }

  function renderEdgeAnimation(anchors1, anchors2, data, duration, ease, dummy) {
    var path = svg.append('path').attr('fill', 'none');
    path.attr('d', lineFunc(anchors1));
    path.transition().duration(duration).ease(ease)
    .attr('d', lineFunc(anchors2));

    var mid1 = anchors1[Math.floor(anchors1.length / 2)];
    var mid2 = anchors2[Math.floor(anchors2.length / 2)];

    var group = svg.append('g');
    group.attr('transform', 'translate(' + mid1.x + ',' + mid1.y + ')');
    drawEdge(path, group, data);
    var animation = group.transition().duration(duration).ease(ease)
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
