DrawingEngine.VAR_SIZE = 20;
DrawingEngine.ARR_SIZE = 30;
DrawingEngine.C_SIZE = 12;

function DrawingEngine(){
	DrawingEngine._self = this; // not sure if is needed

  // this.svg = null;
  // this.vis = null;
  // this.edgesLayer = null;
  // this.nodesLayer = null;

  this.width = window.innerWidth;
  this.height = window.innerHeight;
  this.cola_obj = cola.d3adaptor().linkDistance(50).size([this.width, this.height]);
}

DrawingEngine.prototype.init_svg = function (){
  if (!this.svg) {
    this.svg = d3.select("#content").append("svg").attr("width", this.width).attr("height", this.height);
    this.svg.call(d3.behavior.zoom().on("zoom", (function(caller) {
        return function() {caller.apply_zooming.apply(caller, arguments);};
      })(this)));
    this.vis = this.svg.append('g');
    this.edgesLayer = this.vis.append("g");
    this.nodesLayer = this.vis.append("g");
  }
};

DrawingEngine.prototype.apply_zooming = function(){
  this.vis.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
};

DrawingEngine.prototype.draw = function(){
  this.cola_obj.nodes([].concat(data.constraint_nodes, shown_v)).links(cola_links).start();

  var v_nodes = this.nodesLayer.selectAll(".v_node")
    .data(shown_v.filter(function(v) {
      return (v.type !== "arr");

    }))
    .enter().append("circle")
    .attr("class", "v_node")
    .attr("r", DrawingEngine.VAR_SIZE / 2);

  var a_nodes = this.nodesLayer.selectAll(".a_node")
    .data(shown_v.filter(function(v) {return (v.type === "arr");}))
    .enter().append("rect")
    .attr("class", "a_node")
    .attr("width", DrawingEngine.ARR_SIZE)
    .attr("height", DrawingEngine.ARR_SIZE);

  var c_nodes = this.nodesLayer.selectAll(".c_node")
    .data(data.constraint_nodes)
    .enter().append("path")
    .attr("class", "c_node");

  var link = this.edgesLayer.selectAll(".straight_link")
      .data(links)
      .enter().append("line")
      .attr("class", "straight_link");

    this.cola_obj.on("tick", (
      function(caller) {
        return function() {caller.update_drawing.apply(caller, arguments);};
      }
    )(this));

};

DrawingEngine.prototype.update_drawing = function(){
  var v_node = this.nodesLayer.selectAll(".v_node");
  var c_node = this.nodesLayer.selectAll(".c_node");
  var a_node = this.nodesLayer.selectAll(".a_node");
  var s_link = this.edgesLayer.selectAll(".straight_link");
  var q_link = this.edgesLayer.selectAll(".curved_link");

  v_node.attr("cx", function (d) { return d.x; })
        .attr("cy", function (d) { return d.y; })
        .append("title").text(function (d) { return d.name; });

  a_node.attr("x", function (d) { return d.x - DrawingEngine.ARR_SIZE/2; })
        .attr("y", function (d) { return d.y - DrawingEngine.ARR_SIZE/2; })
        .on("click", function (d) {expand_node(d);})
        .append("title").text(function (d) { return d.name; });

  c_node.attr("d", function (d) {
    var h = 16;
    return "M " + d.x + " " + (d.y - h/2) + " l " + (h/2) + " " + (h) + " l " + (-h) + " " + ("0") + " z";
  })
  .append("title").text(function (d) { return d.type; });

  s_link.attr("x1", function (d) { return d.source.x; })
    .attr("y1", function (d) { return d.source.y; })
    .attr("x2", function (d) { return d.target.x; })
    .attr("y2", function (d) { return d.target.y; });
};