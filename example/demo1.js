function demo() {
  var width = 800;
  var height = 600;
  var graph = d3graph(d3.select('#main'), // draw graph on the selected 'main' div
    width, height,
    function(group, data) { // drawNode function
      var size = 5;
      group.append('circle').attr('r', data.size).attr('stroke','#000').attr('fill', data.color);
      group.append('text').text(data.text);
    },
    function(path, group, data) { // drawEdge function
      path.attr('stroke','#000');
      if (data.dash) {
        path.attr('stroke-dasharray', data.dash);
      }
      group.append('text').text(data.text);
    }
  );

  graph.addNode('a', {text: 'a', size: 5, color: '#FAF'});
  graph.addNode('b', {text: 'b', size: 7, color: '#AFF'});
  graph.addEdge('a-b', 'a', 'b', {text: 'a-b'});
  graph.redraw();

  graph.addNode('c', {text: 'c', size: 3, color: '#FAA'});
  graph.addEdge('a-c', 'a', 'c', {dash: [2,2]});
  graph.redraw(500);

  setTimeout(function() {
    graph.addEdge('a-c-2', 'a', 'c', {});
    graph.addEdge('b-c', 'b', 'c', {});
    graph.redraw(500);
  }, 1500);
}
