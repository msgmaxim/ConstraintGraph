DrawingEngine.VAR_SIZE = 20;
DrawingEngine.PADDING = 5;
DrawingEngine.ARR_SIZE = 30;
DrawingEngine.C_SIZE = 12;

var v_nodes;
var c_nodes;
var a_nodes;
var exp_a_nodes;
var s_links;
var q_link;
var two_dim_array_e;

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
    v_nodes = this.nodesLayer.selectAll(".v_node")
    .data(shown_v.filter(function(v) {
      return (v.type !== "arr");
    }));

    v_nodes.enter().append("circle")
    .attr("class", "v_node")
    .attr("r", DrawingEngine.VAR_SIZE / 2)
    .each(function(d) {d.svg_element = this;})
    .append("title").text(function (d) { return d.name; });

    v_nodes.exit().remove();
};

DrawingEngine.prototype._draw_constraint_nodes = function(){
  c_nodes = this.nodesLayer.selectAll(".c_node")
    .data(data.constraint_nodes);

  c_nodes.each(function(d) { d.svg_element = this; }); // because svg_elements becomes undefined for some reason

  c_nodes.enter().append("path")
    .attr("class", "c_node")
    .on("mouseover", function (d) {
      // console.log(d3.select(this));
      // console.log(d);
      DrawingEngine.highlight_element(d);
    })
    .on("mouseleave", function (d) {
      DrawingEngine.unhighlight_all();
    })
    .each(function(d) {d.svg_element = this;})
    .append("title").text(function (d) { return d.type; });

  c_nodes.exit().remove();
};

DrawingEngine.highlight_element = function(n){
  d3.select(n.svg_element).attr("style", function (d) {return "fill: rgba(255, 255, 0, 1)";});

  for (var i in n.arr) {

    if (n.arr[i].svg_element && (n.arr[i].type === "svar"||
      (n.arr[i].type === "arr" && n.arr[i].isCollapsed) ||
      (n.arr[i].type === "array_element" && !n.arr[i].host.isCollapsed)))
      d3.select(n.arr[i].svg_element).attr("style", function (d) {return "fill: rgba(255, 255, 0, 1)";});
    // else

      // console.log(n.arr[i]);
  }
  // console.log("new");
};

DrawingEngine.unhighlight_all = function(){
  d3.selectAll(".two_dim_array_e").attr("style", function (d) {return "fill: rgba(255, 255, 255, 1"});
  d3.selectAll(".c_node").attr("style", function (d) {return "fill: rgba(255, 0, 0, 1"});
  d3.selectAll(".a_node").attr("style", function (d) {return "fill: rgba(255, 255, 255, 1"});
  d3.selectAll(".v_node").attr("style", function (d) {return "fill: rgba(255, 255, 255, 1"});
};

DrawingEngine.prototype._draw_array_nodes = function() {
  a_nodes = this.nodesLayer.selectAll(".a_node")
    .data(shown_v.filter(function(v) {return (v.type === "arr" && v.isCollapsed === true);}), function (d) { return d.name; });

  var a_nodes_enter = a_nodes.enter();

  console.log(shown_v.filter(function(v) {return (v.type === "arr" && v.isCollapsed === true);}));

  a_nodes.each(function(d) { d.svg_element = this; }); // because svg_elements becomes undefined for some reason

  var poo = a_nodes_enter;

  a_nodes_enter.append("rect")
    .attr("class", "a_node")
    .attr("width", DrawingEngine.ARR_SIZE)
    .attr("height", DrawingEngine.ARR_SIZE)
    .each(function(d) {d.svg_element = this;})
    .on("click", function (d) {expand_node(d);})
    .append("title").text(function (d) { return d.name; });

  a_nodes.exit().remove();
};

DrawingEngine.prototype._draw_expanded_arrays = function() {

  exp_a_nodes = this.nodesLayer.selectAll(".exp_a_node")
    .data(shown_v.filter(function(v) {return (v.type === "arr" && v.isCollapsed === false);}));



  this.nodesLayer.selectAll(".exp_a_node").each(function(d) { d.svg_element = this; }); // because svg_elements becomes undefined for some reason

  exp_a_nodes.enter().append("rect")
    .attr("class", "exp_a_node")
    .attr("width", DrawingEngine.ARR_SIZE * 2)
    .attr("height", DrawingEngine.ARR_SIZE * 2)
    .each(function(d) {d.svg_element = this;})
    .append("title").text(function (d) { return d.name; });

  var temp_data = [];

  d3.selectAll(".exp_a_node").each(function(d) {
    if (d.dims === 2){
      for (var i = 0; i < d.n[0]; i++){
        for (var j = 0; j < d.n[1]; j++){
          var obj = data.all_v[d.name + "[" + (i * d.n[1] + j + 1) + "]"];
          obj.i = i; obj.j = j; obj.host = d;
          obj.real_name = d.name + "[" + (i + 1) + ", " + (j + 1) + "]";
          temp_data.push(obj);
          
        }
      }
    }

  });

  console.log(this.nodesLayer.selectAll(".two_dim_array_e"));
  console.log(this.nodesLayer.selectAll(".two_dim_array_e").data(temp_data).enter());

  this.nodesLayer.selectAll(".two_dim_array_e")
  .data(temp_data, function (d) { return d.name; }).enter().append('rect')
  .attr("class", "two_dim_array_e")
  .attr("width", DrawingEngine.VAR_SIZE)
  .attr("height", DrawingEngine.VAR_SIZE)
  .each(function (d) {
    d.svg_element = this;
    d.type = "array_element";
    console.log("adding element " + d.real_name);
  })
  .append("title").text(function (d) { return d.real_name; });

  two_dim_array_e = this.nodesLayer.selectAll(".two_dim_array_e");

};

DrawingEngine.prototype._draw_links = function() {
  s_links = this.edgesLayer.selectAll(".straight_link").data(links);
  s_links.enter().append("line").attr("class", "straight_link");

  s_links.exit().remove();
};

DrawingEngine.prototype._update_drawing = function(){

  v_nodes.attr("cx", function (d) { return d.x; })
        .attr("cy", function (d) { return d.y; });
        
  a_nodes.attr("x", function (d) { return d.x - DrawingEngine.ARR_SIZE/2; })
        .attr("y", function (d) { return d.y - DrawingEngine.ARR_SIZE/2; });
        
  exp_a_nodes.attr("x", function (d) { return d.x - DrawingEngine.ARR_SIZE; })
            .attr("y", function (d) { return d.y - DrawingEngine.ARR_SIZE; });
            
  two_dim_array_e
    .attr("x", function (d) { d.x = d.host.x + (DrawingEngine.VAR_SIZE + DrawingEngine.PADDING) * d.j - d.host.w / 2 + DrawingEngine.VAR_SIZE/2; return d.x - DrawingEngine.VAR_SIZE/2;})
    .attr("y", function (d) { d.y = d.host.y + (DrawingEngine.VAR_SIZE + DrawingEngine.PADDING) * d.i - d.host.h / 2 + DrawingEngine.VAR_SIZE/2; return d.y - DrawingEngine.VAR_SIZE/2;});
    

  c_nodes.attr("d", function (d) {
    var h = 16;
    return "M " + d.x + " " + (d.y - h/2) + " l " + (h/2) + " " + (h) + " l " + (-h) + " " + ("0") + " z";
  });
  
  s_links.attr("x1", function (d) { return d.source.x; })
    .attr("y1", function (d) { return d.source.y; })
    .attr("x2", function (d) { return d.real_target.x; })
    .attr("y2", function (d) { return d.real_target.y; });
};


/// auxiliary functions

function hasClass(elem, className) {
    return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
}

function addClass(elem, className) {
    if (!hasClass(elem, className)) {
        elem.className += ' ' + className;
    }
}

function removeClass(elem, className) {
    var newClass = ' ' + elem.className.replace( /[\t\r\n]/g, ' ') + ' ';
    if (hasClass(elem, className)) {
        while (newClass.indexOf(' ' + className + ' ') >= 0 ) {
            newClass = newClass.replace(' ' + className + ' ', ' ');
        }
        elem.className = newClass.replace(/^\s+|\s+$/g, '');
    }
}