function demo() {
  let width = 800;
  let height = 600;
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

  graph.addNode(0, '0');
  graph.addNode(1, '1');
  graph.addEdge(01, 0, 1);
  graph.redraw();

  graph.addNode(2, '2');
  graph.addEdge(12, 1, 2);
  //graph.addEdge(012, 0, 1);
  //graph.addEdge(013, 0, 1);
  //graph.delNode(1);
  setTimeout(function() {
    graph.redraw(500);
  }, 1500);
}
