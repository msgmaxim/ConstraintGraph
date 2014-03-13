DrawingEngine.VAR_SIZE = 20;
DrawingEngine.PADDING = 5;
DrawingEngine.ARR_SIZE = 30;
DrawingEngine.C_SIZE = 12;

DrawingEngine.log_svg_elements = false;
DrawingEngine.log_hover = true;
DrawingEngine.allow_drag = true;
DrawingEngine.draw_singles = false;

DrawingEngine.counter = 0;

var v_nodes;
var c_nodes;
var a_nodes;
var exp_a_nodes;
var s_links;
var q_link;
var two_dim_array_e;
var min_a_btns;

var transform = {dx: 0, dy: 0, scale: 1};
var old_d3_translate = [0, 0];

var nodeMouseDown = false;

function DrawingEngine(){
	DrawingEngine._self = this; // not sure if is needed

  this.width = window.innerWidth - 20;
  this.height = window.innerHeight - 20;
  this.cola_obj = cola.d3adaptor().size([this.width, this.height]);
  window.addEventListener('resize', function(event){
    DrawingEngine._self.svg.attr('width', window.innerWidth - 20);
    DrawingEngine._self.svg.attr('height', window.innerHeight - 20);
  });
}

DrawingEngine.prototype.init_svg = function (){
  if (!this.svg) {
    this.svg = d3.select("#content").append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("id", "svg")
      // .attr("preserveAspectRatio", "xMinYMin meet")
    // this.svg.append('rect')
    //     .attr('class', 'background')
    //     .attr('width', "100%")
    //     .attr('height', "100%")
        .call(d3.behavior.zoom().on("zoom", (function(caller) {
        return function() {caller._apply_zooming.apply(caller, arguments);};
      })(this)));

    this.vis = this.svg.append('g');
    this.edgesLayer = this.vis.append("g");
    this.nodesLayer = this.vis.append("g");
    this.buttonsLayer = this.vis.append("g");
  }
};

DrawingEngine.prototype._apply_zooming = function(){

  if (!nodeMouseDown) {
    transform.dx += (d3.event.translate[0] - old_d3_translate[0]);
    transform.dy += (d3.event.translate[1] - old_d3_translate[1]);
    transform.scale = d3.event.scale;

  // memorize offset for x and y
    this.vis.attr("transform", "translate(" + [transform.dx, transform.dy] + ")" + " scale(" + transform.scale + ")");
  }

  old_d3_translate[0] = d3.event.translate[0];
  old_d3_translate[1] = d3.event.translate[1];
    
};

DrawingEngine.prototype.draw = function(){
  var filtred = DrawingEngine._filter_single_nodes(); // brings changes to shown_v

  this.cola_obj.nodes(filtred).links(cola_links).start(5, 5,  5);

  this._draw_single_variables(filtred);
  this._draw_array_nodes(filtred);
  this._draw_expanded_arrays(filtred);
  this._draw_constraint_nodes();
  this._draw_links();
  DrawingEngine._update_highlighting();

  this.cola_obj.on("tick", (
    function(caller) {
      return function() {caller._update_drawing.apply(caller, arguments);};
    }
  )(this));
};

DrawingEngine._filter_single_nodes = function(){
  // all nodes are thought to be disconnected
  shown_v.forEach(function(n) { n.has_links = false; });

  // loop through all links to spot connected nodes
  cola_links.forEach(function(l) {
    l.target.has_links = l.source.has_links = true;
  })

  // remove disconnected nodes
  return shown_v.filter(function(n) { return n.has_links; })
}

DrawingEngine._draw_var_list = function(){
  // var filtred = DrawingEngine._filter_single_nodes()
  var filtred = shown_v
    .filter(function (d) {
      return (d.isHighlighted === true);
    });

  var var_names = d3.select("#var_names").selectAll("p").data(filtred, function (d) { return d.name; });

  var_names.enter().append("p").text(function(d) { return d.name; });

  var_names.exit().remove();
};

DrawingEngine._update_highlighting = function(){
  // var filtred = DrawingEngine._filter_single_nodes();
  var filtred = shown_v;
  filtred.forEach(function(n){
    if (n.isHighlighted){
      DrawingEngine.highlight_svg_element(n);
      var model_node = vLayout.model_nodes[n.name];
      if (model_node !== undefined)
        DrawingEngine.highlight_svg_element(model_node);
    }
    else
    {
      d3.select(n.svg_element).style("fill", function (d) {return "rgba(255, 255, 255, 1)";});
      if (vLayout.isReady)
        d3.select(vLayout.model_nodes[n.name]).attr("style", function (d) {return "fill: " + VarLayout.getRightColor(d);});
        // d3.select(vLayout.model_nodes[n.name]).style("fill", function (d) {return "rgba(255, 255, 255, 1)";});
    }
      
  })

  if (vLayout.isReady)
    vLayout.mark_hidden();


}

/// gets called when mouse is over a node
DrawingEngine._highlight_neighbours = function(n) {
  links.forEach(function(l){
  if (l.source === n && !l.target.isHighlighted)
    DrawingEngine.highlight_svg_dimly(l.target);
  else if (l.target === n && !l.source.isHighlighted)
    DrawingEngine.highlight_svg_dimly(l.source);
  });
}

DrawingEngine.prototype._draw_single_variables = function(nodes){
    v_nodes = this.nodesLayer.selectAll(".v_node")
    .data(nodes.filter(function(v) {
      // return (v.type !== "arr");
      return (v.type === "svar");
    }), function (d) { return d.name; });

    // nodes.forEach(function (d){ d.width = DrawingEngine.VAR_SIZE; d.height = DrawingEngine.VAR_SIZE });



    v_nodes.enter().append("circle")
    .attr("class", "v_node")
    .attr("r", DrawingEngine.VAR_SIZE / 2)
    .each(function(d) {
      d.svg_element = this;
    })
    .on("click", function (d) {
        DrawingEngine.toggle_highlight_var(d);
        DrawingEngine._highlight_neighbours(d);
    })
    .on("mousedown", function () { nodeMouseDown = true;  console.log("mouse down");} )
    .on("mouseup", function() { nodeMouseDown = false; console.log("mouse up");})
    .on("mouseover", function (n) {
      DrawingEngine._highlight_neighbours(n);
    })
    .on("mouseleave", function (n) {
      DrawingEngine._update_highlighting();
    })
    .append("title").text(function (d) { return d.name; });

    if (DrawingEngine.allow_drag)
      v_nodes.call(this.cola_obj.drag);

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
      if (DrawingEngine.log_hover)
        console.log("%cc_node: ", "color: orange", d);
      DrawingEngine.highlight_cnode(d);

    })
    .on("mouseleave", function (d) {
      DrawingEngine.set_all_unhighlighted();
      // DrawingEngine._update_highlighting();
    })
    .each(function(d) {d.svg_element = this; console.log("we do draw cnodes")})
    .append("title").text(function (d) { return d.type; });

    // c_nodes.enter().append('p').attr("text", function (d) {return d.name}); /// want to show all constraints

  c_nodes.exit().remove();
};

DrawingEngine.highlight_cnode = function(n){
  // d3.select(n.svg_element).attr("style", function (d) {return "fill: gold";}); to remove
  if (n.cnode)
    // DrawingEngine.highlight_svg_element(n.cnode);
    n.cnode.isHighlighted = true;    

  for (var i in n.arr) {

    if (n.arr[i].svg_element && (n.arr[i].type === "svar"||
      (n.arr[i].type === "arr" && n.arr[i].isCollapsed) ||
      (n.arr[i].type === "array_element" && !n.arr[i].host.isCollapsed)))
      n.arr[i].isHighlighted = true;
  }
};

// highlight the var_node and everything connected
DrawingEngine.highlight_var = function(n){
  
  n.isHighlighted = true;
};

DrawingEngine.toggle_highlight_var = function(n) {
  if (n.isHighlighted === undefined || n.isHighlighted === false)
    DrawingEngine.highlight_var(n);
  else
    n.isHighlighted = false;

  DrawingEngine._update_highlighting();
  DrawingEngine._draw_var_list();

  // might want to highlight adjacent nodes as well
}

DrawingEngine.highlight_svg_element = function(n){
  // if (n === undefined) return;
  var svg = (n.svg_element === undefined) ? n : n.svg_element;
  d3.select(svg).attr("style", function (d) {return "fill: gold";});
}

DrawingEngine.unhighlight_svg_element = function(n){
  var svg = (n.svg_element === undefined) ? n : n.svg_element;
  d3.select(svg).attr("style", function (d) {return "fill: whilte";});
}

DrawingEngine.clear_selection = function(){
  DrawingEngine.set_all_unhighlighted();
  DrawingEngine._update_highlighting();
  DrawingEngine._draw_var_list();
}

DrawingEngine.highlight_svg_dimly = function(n){
  d3.select(n.svg_element).attr("style", function (d) {return "fill: Lavender";});
}

// DrawingEngine.unhighlight_all = function(){
//   DrawingEngine._filter_single_nodes()
//    .forEach(function (d) { d.isHighlighted = false; });

//    DrawingEngine._draw_var_list();

//   d3.selectAll(".two_dim_array_e").attr("style", function (d) {return "fill: rgba(255, 255, 255, 1)";});
//   d3.selectAll(".c_node").attr("style", function (d) {return "fill: rgba(255, 0, 0, 1)";});
//   d3.selectAll(".a_node").attr("style", function (d) {return "fill: rgba(255, 255, 255, 1)";});
//   d3.selectAll(".v_node").attr("style", function (d) {return "fill: rgba(255, 255, 255, 1)";});
// };

DrawingEngine._unhighlight_all = function(){
  d3.selectAll(".two_dim_array_e").attr("style", function (d) {return "fill: rgba(255, 255, 255, 1)";});
  d3.selectAll(".c_node").attr("style", function (d) {return "fill: rgba(255, 0, 0, 1)";});
  d3.selectAll(".a_node").attr("style", function (d) {return "fill: rgba(255, 255, 255, 1)";});
  d3.selectAll(".v_node").attr("style", function (d) {return "fill: rgba(255, 255, 255, 1)";});
};

DrawingEngine.set_all_unhighlighted = function (){
  console.log("setting unhighlighted");
  shown_v.forEach(function (d) { d.isHighlighted = false; d.isHighlightedDimly = false; });
}

DrawingEngine.prototype._draw_array_nodes = function(nodes) {
   if (DrawingEngine.log_svg_elements) console.group("A_NODES");
  a_nodes = this.nodesLayer.selectAll(".a_node")
    .data(nodes.filter(function(v) {return (v.type === "arr" && v.isCollapsed === true);}), function (d) { return d.name; });

  var a_nodes_enter = a_nodes.enter();

  // console.log(nodes.filter(function(v) {return (v.type === "arr" && v.isCollapsed === true);}));

  a_nodes.each(function(d) {
    d.svg_element = this;
  }); // because svg_elements becomes undefined for some reason

  a_nodes_enter.append("rect")
    .attr("class", "a_node")
    .attr("width", DrawingEngine.ARR_SIZE)
    .attr("height", DrawingEngine.ARR_SIZE)
    .each(function(d) {
      d.svg_element = this;
      if (DrawingEngine.log_svg_elements) console.log("%c+ a_node created:", "color: blue", d, "with svg: ", this);
      if (!this.aaa_id)
        this.aaa_id = ++DrawingEngine.counter;
    })
    .on("mouseover", function (d) {
      DrawingEngine.highlight_var(d);
    })
    .on("mouseleave", function (d) {
      DrawingEngine.unhighlight_all();
    })
    .attr("aaa_id", DrawingEngine.counter)
    .on("click", function (d) {expand_node(d);})
    .append("title").text(function (d) { return d.name; });

  a_nodes.exit().each(function (d){
    if (DrawingEngine.log_svg_elements) console.log("%c- a_node removed:", "color: brown", d, "with svg: ", this);
  })
  .remove();
   if (DrawingEngine.log_svg_elements) console.groupEnd();
};

DrawingEngine.prototype._draw_expanded_arrays = function(nodes) {
   if (DrawingEngine.log_svg_elements) console.group("EXPANDED_A_NODES");

  exp_a_nodes = d3.selectAll(".exp_a_node")
    .data(nodes.filter(function(v) {return (v.type === "arr" && v.isCollapsed === false);}),
      function (v) { return v.name; }); /// key function to recognize created elements

  this.nodesLayer.selectAll(".exp_a_node").each(function(d) { d.svg_element = this; }); // because svg_elements becomes undefined for some reason

  exp_a_nodes.enter()
  .append("rect")
    .attr("class", "exp_a_node")
    .attr("width", function (d) {
      /// TODO: for other (higher than 2) dimentions as well
      /// TODO: do we need to recalculate width/height each time?
      if (d.dims === 2)
        return d.width = d.n[1] * (DrawingEngine.VAR_SIZE + DrawingEngine.PADDING) - DrawingEngine.PADDING;
      else if (d.dims === 1)
        return d.width = d.n[0] * (DrawingEngine.VAR_SIZE + DrawingEngine.PADDING) - DrawingEngine.PADDING;
    })
    .attr("height", function (d) {
      if (d.dims === 2)
        return d.height = d.n[0] * (DrawingEngine.VAR_SIZE + DrawingEngine.PADDING) - DrawingEngine.PADDING;
      else if (d.dims === 1)
        return d.height = DrawingEngine.VAR_SIZE;
    })
    .each(function(d) {
      if (DrawingEngine.log_svg_elements) console.log("%c+ expanded_a_node created:", "color: blue", d, "with svg: ", this);
      this.aaa_id = ++DrawingEngine.counter;
      d.svg_element = this;
    })
    .attr("aaa_id", DrawingEngine.counter)
    .append("title").text(function (d) { return d.name; });

  exp_a_nodes.exit().each(function (d){
    if (DrawingEngine.log_svg_elements) console.log("%c- exp_a_node removed:", "color: brown", d);
  }).remove();

  var temp_data = [];

  d3.selectAll(".exp_a_node").each(function(d) {
    var i, obj;
    if (d.dims === 2){
      console.log("array_vars: ", d.vars);
      for (i = 0; i < d.n[0]; i++){
        for (var j = 0; j < d.n[1]; j++){
          // obj = data.all_v[d.name + "[" + (i * d.n[1] + j + 1) + "]"];
          obj = d.vars[i * d.n[1] + j]; /// TODO: really?!
          obj.i = i; obj.j = j; obj.host = d;
          if (!obj.real_name)
            obj.real_name = d.name + "[" + (i + 1) + ", " + (j + 1) + "]";
          temp_data.push(obj);
          
        }
      }
    } else if (d.dims === 1) {
      for (i = 0; i < d.n[0]; i++){
        // obj = data.all_v[d.name + "[" + (i + 1) + "]"];
        obj = d.vars[i];
        obj.i = 0;
        obj.j = i;
        obj.host = d;
        if (!obj.real_name)
          obj.real_name = d.name + "[" + (i + 1) + "]";
        temp_data.push(obj);
      }
    }
  });

 /// ****************** all elements of 1/2-dim arrays ***************

  two_dim_array_e = this.nodesLayer.selectAll(".two_dim_array_e")
  .data(temp_data, function (d) { return d.name; });

  two_dim_array_e.enter().append('rect')
  .attr("class", "two_dim_array_e")
  .attr("width", DrawingEngine.VAR_SIZE)
  .attr("height", DrawingEngine.VAR_SIZE)
  .on("mouseover", function (d) {
      DrawingEngine.highlight_var(d);
    })
  .on("mouseleave", function (d) {
      DrawingEngine.set_all_unhighlighted();
      // DrawingEngine._update_highlighting();
    })
  .each(function (d) {
    d.svg_element = this;
    d.type = "array_element";
  })
  .append("title").text(function (d) { return d.real_name; });

  two_dim_array_e.exit().remove();

  two_dim_array_e = this.nodesLayer.selectAll(".two_dim_array_e");

  /// **************************************************************

  /// ****************** buttons to collapse arrays *****************

  min_a_btns = this.nodesLayer.selectAll(".min_a_btn")
   .data(nodes.filter(function(v) {return (v.type === "arr" && v.isCollapsed === false);}),
    function (v) { return v.name; });
  
  min_a_btns.enter()
   .append("rect")
   .attr("class", "min_a_btn")
   .attr("width", DrawingEngine.VAR_SIZE / 2)
   .attr("height", DrawingEngine.VAR_SIZE / 2)
   .attr("rx", "3px").attr("ry", "3px")
   .on("click", function (d) {collapse_node(d);});

  min_a_btns.exit().remove();

  min_a_btns = this.nodesLayer.selectAll(".min_a_btn");

   if (DrawingEngine.log_svg_elements) console.groupEnd();
  /// ***************************************************************

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
        
  exp_a_nodes.attr("x", function (d) { return (d.x - d.width/2); })
            .attr("y", function (d) { return d.y - d.height/2; });

  min_a_btns.attr("x", function (d) { return d.x + d.width / 2 - 5; })
   .attr("y", function (d) { return d.y - d.height / 2 - 5; });
            
  two_dim_array_e
    .attr("x", function (d) { d.x = d.host.x + (DrawingEngine.VAR_SIZE + DrawingEngine.PADDING) * d.j - d.host.w / 2 + DrawingEngine.VAR_SIZE/2; return d.x - DrawingEngine.PADDING;})
    .attr("y", function (d) { d.y = d.host.y + (DrawingEngine.VAR_SIZE + DrawingEngine.PADDING) * d.i - d.host.h / 2 + DrawingEngine.VAR_SIZE/2; return d.y - DrawingEngine.PADDING;});
    
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
    return new RegExp(' ' + className + ' ').test('  ' + elem.className + ' ');
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