function demo() {
  let width = 800;
  let height = 300;
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
  graph.addNode(0, 'n0');
  function randomUpdate() {
    function addNode() {
      let r = Math.floor(Math.random() * nodes.length);
      let id1 = nodes[r];
      let id2 = n;
      graph.addNode(id2, 'n'+id2);
      graph.addEdge('e'+id1+id2, id1, id2);
      nodes.push(id2);
      n = n + 1;
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
        graph.addEdge('e' + id1 + id2, id1, id2);
      } else if (id2 < id1) {
        graph.addEdge('e' + id1 + id2, id2, id1);
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
