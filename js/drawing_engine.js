DrawingEngine.VAR_SIZE = 20;
DrawingEngine.PADDING = 5;
DrawingEngine.ARR_SIZE = 30;
DrawingEngine.C_SIZE = 12;

function DrawingEngine(){
	DrawingEngine._self = this; // not sure if is needed

  this.width = window.innerWidth;
  this.height = window.innerHeight;
  this.cola_obj = cola.d3adaptor().size([this.width, this.height]);
}

DrawingEngine.prototype.init_svg = function (){
  if (!this.svg) {
    this.svg = d3.select("#content").append("svg").attr("width", this.width).attr("height", this.height);
    this.svg.call(d3.behavior.zoom().on("zoom", (function(caller) {
        return function() {caller._apply_zooming.apply(caller, arguments);};
      })(this)));
    this.vis = this.svg.append('g');
    this.edgesLayer = this.vis.append("g");
    this.nodesLayer = this.vis.append("g");
  }
};

DrawingEngine.prototype._apply_zooming = function(){
  this.vis.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
};

DrawingEngine.prototype.draw = function(){
  this.cola_obj.nodes([].concat(data.constraint_nodes, shown_v)).links(cola_links).start();

  this._draw_single_variables();
  this._draw_array_nodes();
  this._draw_expanded_arrays();
  this._draw_constraint_nodes();
  this._draw_links();

  this.cola_obj.on("tick", (
    function(caller) {
      return function() {caller._update_drawing.apply(caller, arguments);};
    }
  )(this));
};

DrawingEngine.prototype._draw_single_variables = function(){
    var v_nodes = this.nodesLayer.selectAll(".v_node")
    .data(shown_v.filter(function(v) {
      return (v.type !== "arr");
    }));

    v_nodes.enter().append("circle")
    .attr("class", "v_node")
    .attr("r", DrawingEngine.VAR_SIZE / 2);

    v_nodes.exit().remove();
};

DrawingEngine.prototype._draw_constraint_nodes = function(){
  var c_nodes = this.nodesLayer.selectAll(".c_node")
    .data(data.constraint_nodes);

  c_nodes.enter().append("path")
    .attr("class", "c_node");

  c_nodes.exit().remove();
};

DrawingEngine.prototype._draw_array_nodes = function() {
  var a_nodes = this.nodesLayer.selectAll(".a_node")
    .data(shown_v.filter(function(v) {return (v.type === "arr" && v.isCollapsed === true);}));

  a_nodes.enter().append("rect")
    .attr("class", "a_node")
    .attr("width", DrawingEngine.ARR_SIZE)
    .attr("height", DrawingEngine.ARR_SIZE);

  a_nodes.exit().remove();
};

DrawingEngine.prototype._draw_expanded_arrays = function() {
  var a_nodes = this.nodesLayer.selectAll(".exp_a_node")
    .data(shown_v.filter(function(v) {return (v.type === "arr" && v.isCollapsed === false);}));

    // console.log(a_nodes.enter());

  a_nodes.enter().append("rect")
    .attr("class", "exp_a_node")
    .attr("width", DrawingEngine.ARR_SIZE * 2)
    .attr("height", DrawingEngine.ARR_SIZE * 2);

  var temp_data = [];

  d3.selectAll(".exp_a_node").each(function(d) {
    if (d.dims === 2){
      for (var i = 0; i < d.n[0]; i++){
        for (var j = 0; j < d.n[1]; j++){
          temp_data.push({i: i, j: j, host: d});
        }
      }
    }

  });

  this.nodesLayer.selectAll(".two_dim_array_e").data(temp_data).enter().append('rect')
    .attr("class", "two_dim_array_e")
    .attr("width", DrawingEngine.VAR_SIZE)
    .attr("height", DrawingEngine.VAR_SIZE);

};

DrawingEngine.prototype._draw_links = function() {
  var link = this.edgesLayer.selectAll(".straight_link").data(links);
  link.enter().append("line").attr("class", "straight_link");

  link.exit().remove();
};

DrawingEngine.prototype._update_drawing = function(){
  var v_node = this.nodesLayer.selectAll(".v_node");
  var c_node = this.nodesLayer.selectAll(".c_node");
  var a_node = this.nodesLayer.selectAll(".a_node");
  var exp_a_node = this.nodesLayer.selectAll(".exp_a_node");
  var s_link = this.edgesLayer.selectAll(".straight_link");
  var q_link = this.edgesLayer.selectAll(".curved_link");
  var two_dim_array_e = this.nodesLayer.selectAll(".two_dim_array_e");

  v_node.attr("cx", function (d) { return d.x; })
        .attr("cy", function (d) { return d.y; })
        .append("title").text(function (d) { return d.name; });

  a_node.attr("x", function (d) { return d.x - DrawingEngine.ARR_SIZE/2; })
        .attr("y", function (d) { return d.y - DrawingEngine.ARR_SIZE/2; })
        .on("click", function (d) {expand_node(d);})
        // .on("mouseover", function (d) {console.log(d);})
        .append("title").text(function (d) { return d.name; });

  exp_a_node.attr("x", function (d) { return d.x - DrawingEngine.ARR_SIZE; })
            .attr("y", function (d) { return d.y - DrawingEngine.ARR_SIZE; })
            .on("mouseover", function (d) {console.log(d);})
            .append("title").text(function (d) { return d.name; });

  two_dim_array_e
    .attr("x", function (d) { return d.host.x + (DrawingEngine.VAR_SIZE + DrawingEngine.PADDING) * d.j - d.host.w / 2; })
    .attr("y", function (d) { return d.host.y + (DrawingEngine.VAR_SIZE + DrawingEngine.PADDING) * d.i - d.host.h / 2; });

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