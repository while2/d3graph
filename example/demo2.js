function demo() {
  const width = 600;
  const height = 400;
  const graph = d3graph(d3.select('#main').append('svg'),
    width, height,
    function(group, data) {
      group.append('circle').attr('r', 5).attr('stroke','#AAA').attr('fill', '#FFF');
      group.append('text').text(data);
    },
    function(path, group, data) {
      path.attr('stroke','#000')
      group.append('text').text(data);
    }
  );

  var nodes = [0];
  var n = 1;
  graph.addNode(0, 0);
  graph.redraw();

  function randomUpdate() {
    function addNode() {
      var r = Math.floor(Math.random() * nodes.length);
      var id1 = nodes[r];
      var id2 = (n++) % 100; // reuse nodes
      graph.addNode(id2, id2);
      if (id1 < id2) {
        // id1+id2 to limit total edges
        graph.addEdge(id1+id2, id1, id2);
      } else if (id2 < id1) {
        graph.addEdge(id1+id2, id2, id1);
      }
      nodes.push(id2);
    }
    function delNode() {
      var r = Math.floor(Math.random() * nodes.length);
      graph.delNode(nodes.splice(r, 1));
    }
    function addEdge() {
      var r1 = Math.floor(Math.random() * nodes.length);
      var r2 = Math.floor(Math.random() * nodes.length);
      var id1 = nodes[r1];
      var id2 = nodes[r2];
      if (id1 < id2) {
        graph.addEdge(id1 + id2, id1, id2);
      } else if (id2 < id1) {
        graph.addEdge(id2 + id1, id2, id1);
      }
    }

    if (nodes.length < 10) {
      addNode();
    } else {
      var r = Math.floor(Math.random() * 3);
      if (r === 0) {
        addNode();
      } else if (r === 1) {
        delNode();
      } else if (r === 2) {
        addEdge();
      }
    }
    graph.redraw(1000);
  }

  function run() {
    randomUpdate();
    setTimeout(run, 2000);
  }
  run();
}
