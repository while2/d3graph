function d3graph (div_id, width, height, draw_node, draw_edge, animation) {
  let node_map = {};
  let edge_map = {};
  let svg = d3.select('#' + div_id)
  .append('svg')
  .attr('width', width).attr('height', height);

  function add_node(node_id, data) {
    if (node_map[node_id] !== undefined) throw 'Node ' + node_id + ' already exists';
    node_map[node_id] = {data: data, src: [], dst: []};
  }
  function get_node(id) {
    let node = node_map[id];
    if (node == undefined) throw 'Node ' + id + ' does not exist';
    return node;
  }
  function del_node(node_id) {
    let node = get_node(node_id);
    node.src.forEach(function (id) {
      del_edge(id, node_id);
    });
    node.dst.forEach(function (id) {
      del_edge(node_id, id);
    })
    node_map[node_id] = undefined;
  }
  function add_edge(src_id, dst_id, data) {
    get_node(src_id).dst.push(dst_id);
    get_node(dst_id).src.push(src_id);
    edge_map[src_id + '-' + dst_id] = data;
  }
  function del_edge(src_id, dst_id) {
    let src = get_node(src_id);
    let dst = get_node(dst_id);
    src.dst = src.dst.filter(function (id) {
      return id != dst_id;
    });
    dst.src = dst.src.filter(function (id) {
      return id != src_id;
    });
    edge_map[src_id + '-' + dst_id] = undefined;
  }

  function build_layers(start) {
    let layer_map = {};
    start.forEach(function (id) {
      layer_map[id] = 0;
    })

    // build layered nodes id
    let graph = [start];
    let layer = start;
    for (let l = 1; layer.length > 0; l++) {
      layer = layer.map(function (id) {
        return node_map[id].dst;
      }).reduce(function (set1, set2) {
        set2.forEach(function (id) {
          if (layer_map[id] === undefined) {
            layer_map[id] = l;
            set1.push(id);
          }
        })
        return set1;
      }, []);
      graph.push(layer);
    }

    return graph;
  }
  function sort_layers(graph) {
    // sketch coordsrcates
    for (let round = 0; round < graph.length; ++round) {
      let pos_map = {};
      // srcit pos_map
      graph.forEach(function (layer) {
        layer.forEach(function (id, index) {
          pos_map[id] = (index + 1) / layer.length + 1;
        });
      });

      graph.forEach(function (layer) {
        layer.forEach(function (id) {
          let node = get_node(id);
          let sum = 0.0;
          node.src.forEach(function (id) {
            sum += pos_map[id];
          });
          node.dst.forEach(function (id) {
            sum += pos_map[id];
          });
          pos_map[id] = sum / (node.src.length + node.dst.length);
        });
        layer = layer.sort(function (id1, id2) {
          return pos_map[id1] - pos_map[id2];
        });
      });
    }

    return graph;
  }
  function layout(graph) {
    let pos_map = {};
    graph.forEach(function (layer, i) {
      let x = width * i / graph.length;
      layer.forEach(function (id, j) {
        let y = height * (j + 1) / (layer.length + 1);
        pos_map[id] = {x:x, y:y};
      });
    });
    return pos_map;
  }

  function render(graph1, graph2) {
    let pos_map1 = build_geometry(graph1);
    let pos_map2 = build_geometry(graph2);

  }

  function redraw(start) {
    let g = build_layers(start);
    sort_layers(g);
    let pos_map = layout(g);

    for (let src_id in node_map) {
      let node = node_map[src_id];
      node.dst.forEach(function (dst_id) {
        render_edge(pos_map[src_id], pos_map[dst_id], edge_map[src_id + '-' + dst_id]);
      });
      render_node(pos_map[src_id], node_map[src_id].data);
    }
  }

  function render_node(pos, data) {
    let group = svg.append('g')
    .attr('transform', 'translate(' + pos.x + ',' + pos.y + ')');
    draw_node(group, data);
  }

  function render_edge(pos1, pos2, data) {
    var lineFunc = d3.svg.line()
    .x(function (d) { return d.x; })
    .y(function (d) { return d.y; })
    .interpolate('linear');

    let path = svg.append('path')
    .attr('d', lineFunc([pos1, pos2]));
    let group = svg.append('g')
    .attr('transform', 'translate(' + (pos1.x + pos2.x) / 2 + ',' + (pos1.y + pos2.y) / 2 + ')');
    draw_edge(path, group, data);
  }

  return {
    add_node: add_node,
    add_edge: add_edge,
    redraw: redraw
  };
}
