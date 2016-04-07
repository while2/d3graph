function demo() {
  let width = 600;
  let height = 400;
  var graph = d3graph(d3.select('#main'),
    width, height,
    function(group, data) {
      let size = 5;
      group.append('circle').attr('r', 5).attr('stroke','#AAA').attr('fill', '#FFF');
      group.append('text').text(data);
    },
    function(path, group, data) {
      path.attr('stroke','#000')
      group.append('text').text(data);
    }
  );

  let nodes = [0];
  let n = 1;
  graph.addNode(0, 0);
  function randomUpdate() {
    function addNode() {
      let r = Math.floor(Math.random() * nodes.length);
      let id1 = nodes[r];
      let id2 = (n++) % 100; // reuse nodes
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
      if (nodes.length > 10) {
        let r = Math.floor(Math.random() * nodes.length);
        graph.delNode(nodes.splice(r, 1));
      }
    }
    function addEdge() {
      let r1 = Math.floor(Math.random() * nodes.length);
      let r2 = Math.floor(Math.random() * nodes.length);
      let id1 = nodes[r1];
      let id2 = nodes[r2];
      if (id1 < id2) {
        graph.addEdge(id1 + id2, id1, id2);
      } else if (id2 < id1) {
        graph.addEdge(id2 + id1, id2, id1);
      }
    }

    delNode();
    addNode();
    addEdge();
    graph.redraw(1000);
  }

  function run() {
    randomUpdate();
    setTimeout(run, 2000);
  }
  run();
}
