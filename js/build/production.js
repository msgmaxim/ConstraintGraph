Data.Profiling = true;
// Data.LogParsing = true;

function Data(){
  Data._self = this; // not sure if is needed
  this.global_v_names = {}; // map (var/array)name -> var/array
  this.all_v = {}; // map varname -> var
  this.constraints = [];
  this.constraint_nodes = [];
  this.var_aliases = {};
}

Data.prototype.readNogoodsFile = function (file_name, callback){
  var req = new XMLHttpRequest();
  var ajaxURL = file_name;
  ajaxURL += "?noCache=" + (new Date().getTime()) + Math.random();

  req.open('get', ajaxURL, false);
  req.onload = (function(caller) {
        return function() {caller._parseNoGoods.apply(caller, [arguments[0], callback]);};
      }
    )(this);
  req.send();
}

Data.prototype._parseNoGoods = function (data, callback){
  var resp = data.target.response.trim().replace(/[ ]{2,}/gi, " ");
  var lines = resp.split('\n');
  read_variables(lines);
  read_varlits(lines);
  read_clauses(lines);

  generate_vars();
  generate_graph();

  apply_graph();
  de.draw();
}

Data.prototype.readFile = function (file_name, callback){
  var req = new XMLHttpRequest();
  var ajaxURL = file_name;
  ajaxURL += "?noCache=" + (new Date().getTime()) + Math.random();

  req.open('get', ajaxURL, false);
  req.onload = (function(caller) {
        return function() {caller._initModel.apply(caller, [arguments[0], callback]);};
      }
    )(this);
  req.send();
};

Data.prototype._initModel = function(data, callback){

  if (Data.Profiling) console.time("Parsing time: ");

  var lines = data.target.response.trim().split('\n');
  
  this._parseVariables(lines.filter(Data._isSingleVar).filter(Data._isVariable));
  this._parseArrays(lines.filter(Data._isArray).filter(Data._isVariable));
  this._parseConstraints(lines.filter(Data._isConstraint));
  
  this._loopConstraints(); // something to do with arrays
  this._removeRedundancy(); // handle bool2int constraints
  this._applyAliases();
  

  if (Data.Profiling) console.timeEnd("Parsing time: ");
  callback();
};

Data.prototype.readString = function(str, callback){ // never called?
  var lines = str.trim().split('\n');
  
  this._parseVariables(lines.filter(Data._isSingleVar).filter(Data._isVariable));
  this._parseArrays(lines.filter(Data._isArray).filter(Data._isVariable));
  this._parseConstraints(lines.filter(Data._isConstraint));

  this._loopConstraints();
  this._removeRedundancy();

  callback();
}

Data._isVariable = function(str){
  if (str.split(' ').indexOf("var") !== -1)
    return true;
  return false;
};

Data._isSingleVar = function(str){
  if (str.split(' ')[0] === "var")
    return true;
  return false;
};

Data._isArray = function(str){
  if (str.split(' ')[0] === "array")
    return true;
  return false;
};

Data._isConstraint = function(str){
  if (str.split(' ')[0] === "constraint")
    return true;
  return false;
};

Data.prototype._parseConstraints = function(arr){
  if (Data.LogParsing) console.groupCollapsed("Constraint Strings");
  for (var i = 0; i < arr.length; i++){
    if (Data.LogParsing) console.log("parsed constraints: ", arr[i]);

    var c = Data._parseConstraint(arr[i]);
    this.constraints.push(c);
  }

  if (Data.LogParsing) console.groupEnd();
  // console.log(this.constraints);
};

Data._parseConstraint = function(str){
  var c = {name: "", arr: []};

  var str = str.substring("constraint ".length); // really needed?
  var b1 = str.indexOf('(');
  var b2 = str.indexOf(')');
  c.name = str.substring(0, b1);

  str = str.substring(b1 + 1, b2).trim();

  if (str.charAt(0) === "[" && str.charAt(str.length - 1) === "]"){   /// "[a, b, c]"
    str = str.substring(1, str.length - 1);                           /// "a, b, c"
  } else {
    var structure = Tools.smart_split(str);

        /// TODO: make more use of Tools
    if (c.name === "int_lin_eq")                                      /// constraint int_lin_eq([1, 91, -9000, -90, -900, 10, 1000, -1], [D, E, M, N, O, R, S, Y], 0);
    {
      str = Tools.removeOuterBraces(structure[1]);
    } else if (c.name === "int_lin_eq_reif") {
      str = Tools.removeOuterBraces(structure[1]) + ", " + Tools.smart_split(structure[3])[0];
    } else if (c.name === "array_bool_and"){                          /// constraint array_bool_and([BOOL____00082, BOOL____00083], BOOL____00084) :: defines_var(BOOL____00084);
      str = Tools.removeBraces(str);
    } 
  }

  var vars = str.replace(/[ ]{1,}/gi, "").split(',');                 /// constraint array_int_element(INT____00002, orders, INT____00003) :: defines_var(INT____00003);
  if (c.name === "int_eq")                                            /// constraint int_eq(mark[1], 0);
    c.arr = [vars[0]];
  else
    c.arr = vars;
  
  return c;
};

Data.prototype._applyAliases = function(){
  for (var i in this.constraints){
    var c = this.constraints[i];
    for (var j in c.arr){
      var v = this.constraints[i].arr[j];

      if (this.var_aliases[v.name] !== undefined) {
        console.log("applied aliases!");
        this.constraints[i].arr[j] = this.all_v[this.var_aliases[v.name]];
      }
    }
  }
}

Data.prototype._loopConstraints = function(){
  for (var i = 0; i < this.constraints.length; i++){
    if (Data.LogParsing) console.log("Looping constraint: ", this.constraints[i]);
    var c = this.constraints[i];
    for (var j = 0; j < c.arr.length; j++){
      var v = this.all_v[c.arr[j]];
      if (!v) {  /// array name?
        v = this.global_v_names[c.arr[j]];
        /// assign all variables
        if (!v) {
          // var name_to_delete = c.arr[j];
          c.arr.splice(j, 1);
          j--;
          continue;
        }
        for (e in v.vars){
          v.vars[e].constraints.push(c);
          v.vars[e].host.constraints.push(c);
          // c.arr.push(v.vars[e]);
        }
        c.arr = v.vars;
        /// TODO: sometimes we should not break
        j += v.vars.length;
        // break;
        
      } else { /// not an array name
        v.constraints.push(c);
        if (v.host)
          v.host.constraints.push(c);
        c.arr[j] = v;
      }
    }
  }
};

Data.prototype._removeRedundancy = function() {
  for (var i = 0; i < this.constraints.length; i++){
    var c = this.constraints[i];
    if (c.name === "bool2int"){
      this._collapseVariables(c.arr[0], c.arr[1]);
      delete this.constraints[i];
    }
  }
};

/// collapse v1 into v2
Data.prototype._collapseVariables = function(v1, v2) {
  v2.alias = v1.name;
  console.log("v1: ", v1);
  console.log("v2: ", v2);
  // copy constraints from v1 to v2
  for (var i = 0; i < v1.constraints.length; i++){
    v2.constraints.push(v1.constraints[i]);
  }
  // remove bool2int constraints
  for (var i = 0; i < v2.constraints.length; i++){
    var c = v2.constraints[i];
    if (c.name === "bool2int"){
      // is indeed that constraint? (so as not to remove unprocessed)
      if ((c.arr[0].name === v1.name && c.arr[1].name === v2.name) ||
       (c.arr[0].name === v2.name && c.arr[1].name === v1.name)){
        this.var_aliases[v1.name] = v2.name;
        console.log("removing: ", v2.constraints[i]);
        v2.constraints.splice(i--, 1); // remove links from the variable
      }
    }
  }
  // redirect links for the old variable to the new one
  this.global_v_names[v1.name] = v2;
  this.all_v[v1.name] = v2;
};

Data.prototype._parseVariables = function(arr){
  for (var i = 0; i < arr.length; i++){
    if (Data.LogParsing) console.log("parsed varialbes: ", arr[i]);
    var v = {};
    v.name = arr[i].substring(arr[i].indexOf(':') + 1).match(/[a-zA-z_0-9]+/)[0];
    v.constraints = [];
    // if introduced  TODO: why would I do that?
    if (arr[i].indexOf("introduced") !== -1){
      v.type = "svar"; // single variable
    } else { // not introduced
      v.type = "svar"; // single variable
    }
    this.global_v_names[v.name] = v;
    v.isCollapsed = true;
    this.all_v[v.name] = v;
  }
};

Data.prototype._parseArrays = function(arr){
  for (var i = 0; i < arr.length; i++){
    if (Data.LogParsing) console.log("parsed arrays: ", arr[i]);
    var a = {};

    var structure = Tools.parse_array_str(arr[i]);
    var hasAnnotation = arr[i].indexOf('::') === -1 ? false : true;

    var rest = arr[i].substring(arr[i].indexOf(':') + 1).trim();
    a.name = rest.match(/[a-zA-z_0-9]*/)[0];
    a.type = "arr"; /// shared
    a.isCollapsed = true; /// shared
    a.constraints = [];
    a.vars = [];

    // if dimentions mentioned
    var b1 = rest.indexOf('(');
    var b2 = rest.indexOf(')');


    // TODO: not sure if that would work with other examples
    // if (rest.indexOf('introduced') !== -1 || (structure[1] && structure[1].indexOf('..') === -1)) { // introduced variables
    if (rest.indexOf('=') !== -1 || (structure[1] && structure[1].indexOf('..') === -1)) { // introduced variables
      rest = rest.substring(rest.indexOf('='));
      a.dims = 1;
      b1 = rest.indexOf('[');
      b2 = rest.indexOf(']');

      rest = rest.substring(b1 + 1, b2);
      var vars = rest.replace(/[ ]{1,}/gi, "").split(',');
      for (var q = 0; q < vars.length; q++)
      {

        var v = this.all_v[vars[q]];
        this.var_aliases[v.name] = a.name + "[" + q + "]";
        delete this.global_v_names[v.name]; // the variable turn out to be a part of an array
        v.host = a;
        v.real_name = v.name; // what is a real name?
        v.name = a.name + "[" + q + "]";
        v.constraints = [];
        a.vars.push(v);
      }
      a.n = [vars.length];
    } else { // not introduced variables
      if (hasAnnotation)
        rest = rest.substring(b1 + 2, b2 - 1);
      else
        rest = structure[0];
      var dims = rest.split(',');
      a.dims = dims.length;
      a.n = [];

      var count = 1;
      for (var j = 0; j < dims.length; j++){
        a.n[j] = parseInt(dims[j].match(/[0-9]*$/)[0], 10);
        count *= a.n[j];
      }

      // creating array elements
      for (var k = 1; k <= count; k++){
        var name = a.name + "[" + k + "]";
        var obj = {host:a, name:name, constraints: []};
        a.vars.push(obj);
        this.all_v[name] = obj;
      }
    }

       // TODO: make for all dimentions
    if (a.dims === 2){
     a.w = (DrawingEngine.PADDING + DrawingEngine.VAR_SIZE) * a.n[1] + DrawingEngine.PADDING;
     a.h = (DrawingEngine.PADDING + DrawingEngine.VAR_SIZE) * a.n[0] + DrawingEngine.PADDING;
    } else if (a.dims === 1){
      a.w = (DrawingEngine.PADDING + DrawingEngine.VAR_SIZE) * a.n[0] + DrawingEngine.PADDING;
      a.h = (DrawingEngine.PADDING + DrawingEngine.VAR_SIZE);
    }

    // console.log(a);

    this.global_v_names[a.name] = a;
    // this.global_v.push(a);
  }
};
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
VarLayout.DISTANCE = 10;
NODE_SIZE = 10;
ELEMENT_DISTANCE = 5;
ARR_COLOR = "moccasin";
INT_ARR_COLOR = "green";


function VarLayout(){
	VarLayout._self = this;
	this.model_nodes = {};
	this.isReady = true;
	this.horizontally = false;
	this.height = window.innerHeight - 20;
}

VarLayout.prototype.mark_hidden = function() {
	for (var i = 0; i < shown_v.length; i++) {
		var v = shown_v[i];
		if (!v.has_links) {
			d3.select(vLayout.model_nodes[v.name])
			  .attr("style", function (d) {return "stroke: lightgrey";});
		}
	}

	VarLayout.applyColors();
};

VarLayout.applyColors = function() {
	shown_v.filter(function (v) { return v.has_links; })
		   .forEach( function (v) {
		   		d3.select(vLayout.model_nodes[v.name])
			  	  .attr("style", function (d) {return "fill: " + VarLayout.getRightColor(v);});
		   });
};


VarLayout.prototype.init = function(){

	this.svg = d3.select("#v_layout").append("svg")
      .attr("height", this.height);
    this.vis = this.svg.append('g').attr('class', 'vlayout_vis');
    this.svg.call(d3.behavior.zoom().on("zoom", (function(caller) {
        return function() {caller._apply_zooming.apply(caller, arguments);};
      })(this)));

	// this.canvas.addEventListener('mousedown', handle_dragndrop, false);
  	// this.canvas.addEventListener('mousewheel', handle_mousewheel, false);

	// this.canvas.width  = window.innerWidth * 0.3;
	 // this.canvas.height = window.innerHeight * 0.9;

	
};

VarLayout.prototype._apply_zooming = function(){
  if (nodeMouseDown) return;
  this.vis.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
};

VarLayout.prototype.update_drawing = function(){

	
	var variables = Data._self.global_v_names;

	d3.selectAll(".vl_node").remove();
	d3.selectAll(".vl_label").remove();

	var x = VarLayout.DISTANCE + rel_x;
	var y = VarLayout.DISTANCE + rel_y;

	for (i in variables){
		var item = variables[i];
		item.x = x;
		item.y = y;

		if (item.type == "var")
			y = this.draw_var(item, x, y);
		else if (item.type == "arr"){

			VarLayout._drawLabel(this.vis, item.name, x, y); // adding array labels to vis

			switch(item.n.length){
				case 1:
					y = this.draw_one_dim_array(item, x, y);
				break;
				case 2:
					y = this.draw_two_dim_array(item, x, y);
				break;
				case 3:
					y = this.draw_three_dim_array(item, x, y);
				break;

			}
		}

	}

	this.mark_hidden();
};

VarLayout._drawLabel = function (vis, text, x, y) {
	vis.append('text')
		.attr('x', x - NODE_SIZE / 2)
		.attr('y', y)
		.attr('class', 'vl_label')
		.text(text);
};

VarLayout._getRelPosition = function ( ) {
	// ...
};

VarLayout.prototype._put_node = function (name, x, y){

	x = x - NODE_SIZE/2;
	y = y - NODE_SIZE/2;

	var rect = this.vis.append("rect").attr("class", "vl_node")
    	.attr("width", NODE_SIZE)
    	.attr("height", NODE_SIZE)
    	.attr("x", x).attr("y", y);
    	// .style('fill', VarLayout.getRightColor(var_map[name]));

    rect[0][0].addEventListener('click', function (e){
    	// var v = VarLayout._self.svg_to_var[d.target];
    	var v = e.target.variable;
    	DrawingEngine.toggle_highlight_var(v);
    })

    this.model_nodes[name] = rect[0][0];
    rect[0][0].variable = var_map[name];
    // this.svg_to_var[rect[0][0]] = data.all_v[name];
};

VarLayout.getRightColor = function(d) {
	if (d === undefined)
		return 'white';

	var b = 0.1 + Math.sqrt((d.occurs - min_occurrence) / (max_occurrence - min_occurrence));
	var color = 'rgba(' + 25 +',' + 25 + ',' + 255 + ',' + b + ')';
	console.log(color);
	return color;
};

VarLayout.prototype.draw_one_dim_array = function(item, x, y){
	var vis = this.vis;

	y += NODE_SIZE;

	for (var j = 0; j < item.n[0]; j++){

    	var name = item.name + "[" + (j + 1) + "]";
    	this._put_node(name, x, y);

		x += NODE_SIZE + ELEMENT_DISTANCE;
	}

	y += NODE_SIZE + VarLayout.DISTANCE * 1.5;
	
	return y;
};

VarLayout.prototype.draw_two_dim_array = function(item, x, y){
	var vis = this.vis;
	var init_x = x;

	y += NODE_SIZE;

	for (var i = 0; i < item.n[1]; i++){
		for (var j = 0; j < item.n[0]; j++){
			
	    	var name = item.name + "[" + (i * item.n[0] + j + 1) + "]";
	    	this._put_node(name, x, y);

	    	x += NODE_SIZE + ELEMENT_DISTANCE;

		}
		y += NODE_SIZE + ELEMENT_DISTANCE;
		x = init_x;
	}

	y += VarLayout.DISTANCE * 1.5 - ELEMENT_DISTANCE;

	return y;

	
};

VarLayout.prototype.draw_three_dim_array = function(item, x, y){
	var vis = this.vis;
	y += NODE_SIZE;

	var init_x = x;
	var init_y = y;

	for (var i = 0; i < item.n[0]; i++){
		for (var j = 0; j < item.n[1]; j++){
			for (var k = 0; k < item.n[2]; k++){

				var name = item.name + "[" + (i * item.n[1] * item.n[2] 
					+ j * item.n[2] + k + 1) + "]";

    	   		this._put_node(name, x, y);

				x += NODE_SIZE + ELEMENT_DISTANCE;
			}
			y += NODE_SIZE + ELEMENT_DISTANCE;

			if (j == item.n[1] - 1) {
				if (this.horizontally)
					init_x += item.n[2] * (NODE_SIZE + ELEMENT_DISTANCE) + VarLayout.DISTANCE;
				else
					y += VarLayout.DISTANCE;
			}

			x = init_x;
		}

		if (this.horizontally) 
			y = init_y;
		else
			x = init_x;

	}

	return init_y + item.n[1] * (NODE_SIZE + ELEMENT_DISTANCE) - ELEMENT_DISTANCE + VarLayout.DISTANCE * 1.5;


};
var vLayout = new VarLayout();
var DEFAULT_EDGE_LENGTH = 10;

function VarLayout(){
  this.variables;
  this.new_variables;
  this.context;
  this.canvas;
  this.file_name;

  this.show_introduced = true;
}

var var_map = {};
var variables; // array
var map_varlits; // map
var map_var_name; // map
var links_map = {};
var nogood_shown_v = [];
var nogood_links = [];

function read_variables(lines){ // !good
  variables = [];
  for (i in lines){
    // var index = lines[i].indexOf("FZN:");
    var index = lines[i].indexOf("INTVAR:"); // does it always have to be INTVAR?
    if (index < 0) continue;
      
    var pair = lines[i].substring(index + 7).trim().split(' ');
    variables[i] = {name: pair[0], id: i, occurs: 0};
    var_map[pair[0]] = variables[i];
  }

  console.log("--- variables ids have been read", variables);
}

function read_varlits(lines){ // why so many lines...
  map_varlits = {};
  for (i in lines){

    var index = lines[i].indexOf("VARLITS:");
    if (index < 0) continue;

    var str = lines[i].substring(index + 8);
    var splited = str.trim().split(" ");

    var found = splited[0].indexOf('[');

    if (found >= 0){
      var id = splited[0].substr(found + 1, splited[0].length - found - 3);

      for (var j = 1; j < splited.length; j++){
        map_varlits[Math.abs(parseInt(splited[j]))] =  variables[id];

      }
    }

  
  }

  console.log("--- varlits have been read", map_varlits);
}

function read_clauses(lines){
  clauses = [];
  for (i in lines){

    var index = lines[i].indexOf("CLAUSE:");

    if (index < 0) continue;

    var clause = lines[i].substring(index + 8).split(" ");
    var arr = [];
    for (j in clause){
      var v = map_varlits[Math.abs(parseInt(clause[j]))];
      if (v === undefined) {
        console.log('undefined variable detected: ', clause[j]);   
      } else {
        arr.push(v);
      }
       
    }
    clauses.push(arr);
  

  }

  console.log("--- clauses have been read", clauses);
}

function generate_vars(){
  vLayout.new_variables = {};
  console.log("variables: ", variables);
  for (i in variables){
    var instance = variables[i].name;
    var b1 = instance.indexOf('[');
    var b2 = instance.indexOf(']');
    var name = instance.substring(0, b1);
    var indexes;
    var v_str = vLayout.new_variables[name];
    if (!v_str){
      v_str = {};
      vLayout.new_variables[name] = v_str;
      v_str.id = variables[i].id;
      v_str.arr = [];

      if (b1 != -1){
        var indexes = instance.substring(b1 + 1, b2).split(',');
        var dims = indexes.length; 
        v_str.n = [];
        v_str.type = "array";
        v_str.name = name;
        v_str.dims = dims;
        for (var k = 0; k < dims; k++){
          v_str.n[k] = 0;
        }
      }
    }
    
    if (b1 != -1){  // array
      indexes = instance.substring(b1 + 1, b2).split(',');
      dims = indexes.length;

      var v = {};
      v.indexes = [];

      for (u in indexes)
        v.indexes.push(parseInt(indexes[u]));

      v.id = variables[i].id;

      v_str.arr.push(v);

      for (var j = 0; j < dims; j++){
        if (v_str.n[j] < parseInt(indexes[j]))
          v_str.n[j] = parseInt(indexes[j]);
      }
    }
  }
  console.log("new_variables: ", vLayout.new_variables);
  //vLayout.update_drawing();
}

function generate_graph(){
  // loop through variables

  for (i in variables){
    var item = variables[i];
    item.type = "svar"; 
      nogood_shown_v.push(item);
  }

    // loop through clauses

  for (i in clauses){
    for (var j = 0; j < clauses[i].length; j++){
      for (var k = j+1; k < clauses[i].length; k++){
        if (clauses[i][k] == undefined)
          console.log("ooops");
         connect_nodes(clauses[i][j], clauses[i][k]);
      }
    }

  }

  for (var i in links_map){
    nogood_links.push(links_map[i]);
  }  

  // for (i in links_map){
  //   if (draw_disconnected || links_map[i].occurrence >= min_occurrence)
  //     graph["links"].push(links_map[i]);
  // }

}

function connect_nodes(n1, n2){
  if (n1 == n2) return;

  var v1 = parseInt(n1["id"]), v2 = parseInt(n2["id"]);
  var link;
  if (v1 > v2) {v2 = v1 + v2; v1 = v2 - v1; v2 = v2 - v1;} // swap

  var1 = variables[parseInt(v1)];
  var2 = variables[parseInt(v2)];

  if( links_map[v1 + " " + v2] == undefined) {
    
    link = {};
    
    link.source = var1;
    link.target = var2;

    link.real_target = variables[parseInt(v2)]; // what is real target???
    link.occurrence = 1;

    link["length"] = DEFAULT_EDGE_LENGTH;
    //link["value"] = DEFAULT_EDGE_VALUE;

    links_map[v1 + " " + v2] = link;
  } else {
    link = links_map[v1 + " " + v2];
    //link["value"] += 0.2;
    link["occurrence"] += 1;
  }

  // if (max_occurrence < link["occurrence"])
  //   max_occurrence = link["occurrence"];
}


// subtracts edges links2 from links1
function subtract_graph(links1, links2){
    links_map = {};
    result = [];
    
    for (var i = 0; i < links1.length; i++)
        links_map[give_name(links1[i])] = links1[i];  
    
    for (i = 0; i < links2.length; i++)
        delete links_map[give_name(links2[i])];
        
    for (i in links_map) result.push(links_map[i])
    
    return result;

    function give_name(link){
        var n1 = link.source.name;
        var n2 = link.target.name;
        return n1 < n2 ? n1 + "_" + n2 : n2 + "_" + n1;
    }
}
var SCALE_FACTOR = 1.1;
var scale = 1;
var rel_x = 0;
var rel_y = 0;

var me_prev_x = -1;
var me_prev_y = -1;

function handle_dragndrop(e){
	// console.log(e)
	document.onmousemove = function(e) {
		if (me_prev_x == -1)
			me_prev_x = e.x;
		else{
			rel_x -= (me_prev_x - e.x)/scale;
			me_prev_x = e.x;
		}

		if (me_prev_y == -1)
			me_prev_y = e.y;
		else{
			rel_y -= (me_prev_y - e.y)/scale;
			me_prev_y = e.y;
		}
		
		vLayout.update_drawing();
		// console.log(e);
  };

  document.onmouseup = function() {
  	me_prev_y = -1;
  	me_prev_x = -1;
    document.onmousemove = null;
  };
}

 function handle_mousewheel(e) {
  	// console.log("wheel!");
  	if (e.wheelDelta > 0){
  		vLayout.context.scale(SCALE_FACTOR, SCALE_FACTOR);
  		scale *= SCALE_FACTOR;
  	}
  	else{
  		vLayout.context.scale(1/SCALE_FACTOR, 1/SCALE_FACTOR);  
			scale *= 1/SCALE_FACTOR;
		}
  	vLayout.update_drawing();		

  }
window.addEventListener("load", init);

var data = new Data();
var de = new DrawingEngine();

var isRunInBrouser = true;

var vLayout;
var model_shown_v = [];
var links = [];
var cola_links = [];
var shown_v = [];

var model_links = [];
var diff_links = [];
var difference_graph = false;
// var show_single_vars = false;
var max_occurrence;
var min_occurrence;

function init(){
  de.init_svg();
  document.getElementById("search_input").addEventListener("input", update_search);
  document.getElementById("filter_range").addEventListener("mouseup", update_filter);
  document.getElementById("splitter").addEventListener('mousedown', move_splitter);
  document.getElementById("rotate_btn").addEventListener('click', rotate_vlayout);
  document.getElementById("clear_selection_btn").addEventListener('click', DrawingEngine.clear_selection);
  document.getElementById("svg").addEventListener('mousedown', DragRect.content_mdown);
  document.getElementById("svg").addEventListener('mouseup', DragRect.content_mup);

  console.log(document.getElementById("search_input"));
  if (isRunInBrouser)
    // run_graph('data/cars.fzn')
    // run_graph('data/cars.fzn', 'data/cars_mod.dat');
    // run_graph('data/queen_cp2.fzn', 'data/queens_ng.dat');
    // run_graph('data/golomb_9.fzn', 'data/golomb_ng_9.dat');
    
    // run_graph('data/radiation/radiation_01.fzn', 'data/radiation/radiation_01.dat');
    run_graph('data/radiation/radiation_02.fzn', 'data/radiation/radiation_02.dat');
    // run_graph('data/radiation/radiation_03.fzn', 'data/radiation/radiation_03.dat');
    // run_graph('data/radiation/radiation_04.fzn', 'data/radiation/radiation_04.dat');
    // run_graph('data/radiation/radiation_05.fzn', 'data/radiation/radiation_05.dat');
    // run_graph('data/radiation/radiation_06.fzn', 'data/radiation/radiation_06.dat');
    // run_graph('data/radiation/radiation_07.fzn', 'data/radiation/radiation_07.dat');
    // run_graph('data/radiation/radiation_08.fzn', 'data/radiation/radiation_08.dat');
    // run_graph('data/radiation/radiation_09.fzn', 'data/radiation/radiation_09.dat');

}

function DragRect(){

}

function update_filter_label(value){
  // d3.select('#filter_label').innerHTML = value;
  document.getElementById('filter_label').innerHTML = value;
}

DragRect.content_mdown = function(e) {
  console.log(e);
  // console.log("x: ", e.x, "y: ", e.y);
  // console.log("layerX: ", e.layerX, "layerY: ", e.layerY);
  // console.log("clientX: ", e.clientX, "clientY: ", e.clientY);
  // console.log("offsetX: ", e.offsetX, "offsetY: ", e.offsetY);
  // console.log("pageX: ", e.pageX, "pageY: ", e.pageY);
  if (e.shiftKey){
    nodeMouseDown = true; // not really a nodeMouseDown event;
    document.addEventListener('mousemove', DragRect.update);
  }

  DragRect.x = e.layerX;
  DragRect.y = e.layerY;
}

DragRect.update = function(e) {
  DragRect.draw_rect(DragRect.x, e.layerX, DragRect.y, e.layerY);
}

DragRect.draw_rect = function(x1, x2, y1, y2) {
  if (x1 > x2) x1 = [x2, x2 = x1][0];
  if (y1 > y2) y1 = [y2, y2 = y1][0];

  d3.select('.drag_rect').remove();

  de.svg.append('rect')
        .attr('x', x1)
        .attr('y', y1)
        .attr('class', 'drag_rect')
        .attr('width', Math.abs(x1 - x2))
        .attr('height', Math.abs(y1 - y2));

}

DragRect.content_mup = function(e) {
  if (e.shiftKey){
    nodeMouseDown = false; // not really a nodeMouseDown event;
    capture_nodes(DragRect.x, DragRect.y, e.layerX, e.layerY);
  }

  document.removeEventListener('mousemove', DragRect.update);
    d3.select('.drag_rect').remove();
    
}

function calc_max_occurrence() {
  max_occurrence = diff_links.reduce(function (a, b) { 
    return a > b.occurrence ? a : b.occurrence;
  });  

  console.log("max_occurrence: ", max_occurrence);
}

function count_var_occurrence(){
  diff_links.forEach(function (l) {
    var v1 = l.source;
    var v2 = l.target;

    if (v1.occurs < l.occurrence) v1.occurs = l.occurrence;
    if (v2.occurs < l.occurrence) v2.occurs = l.occurrence;

  });

  min_occurrence = variables.reduce(function (min, curr) {
    return (min > curr.occurs && curr.name.indexOf('[') > 0) ? curr.occurs : min; /// aahhh...
  }, Math.pow(2, 53))

  console.log("min occurrence: ", min_occurrence);
}

function capture_nodes(x1, y1, x2, y2) {
  if (x1 > x2) x1 = [x2, x2 = x1][0];
  if (y1 > y2) y1 = [y2, y2 = y1][0];

  x1 -= transform.dx;
  x2 -= transform.dx;
  y1 -= transform.dy;
  y2 -= transform.dy;

  x1 /= transform.scale;
  x2 /= transform.scale;
  y1 /= transform.scale;
  y2 /= transform.scale;

  // console.log(x1, y1, x2, y2);

  var filtered = DrawingEngine._filter_single_nodes();

  for (var i = 0; i < filtered.length; i++){
    var v = filtered[i];
    if (v.x && (x1 < v.x) && (v.x < x2) && (y1 < v.y) && (v.y < y2)){
      DrawingEngine.highlight_var(v);
      DrawingEngine._update_highlighting();
      DrawingEngine._draw_var_list();

    }
  }
  // de.vis.append('rect')
  //           .attr('x', x1)
  //           .attr('y', y1)
  //           .attr('width', x2 - x1)
  //           .attr('height', y2 - y1)
  //           .style('fill', 'rgba(0, 0, 0, 0.1)');
}

function rotate_vlayout(){
  vLayout.horizontally = !vLayout.horizontally;
  vLayout.update_drawing();
  DrawingEngine._update_highlighting();
}

function move_splitter(e){
  document.onmousemove = function(e) {
    d3.select('#v_layout').attr("width", e.x - 20 + "px");
  };

  document.onmouseup = function() {
    document.onmousemove = null;
  };
}

function run_graph(data_path, nogoods_path){
  if (nogoods_path === undefined){
    difference_graph = false;
    data.readFile(data_path, constr_graph_ready);
  } else {
    difference_graph = true;
    data.readFile(data_path, constr_graph_ready);
    data.readNogoodsFile(nogoods_path, process_nogoods);
    vLayout = new VarLayout();
    vLayout.init();
    vLayout.update_drawing();
  }
  
}

function apply_graph(){
  if (difference_graph)
  {
    links = cola_links = diff_links = subtract_graph(nogood_links, model_links); /// not a copy
    // links = cola_links = diff_links = nogood_links; /// not a copy
    shown_v = nogood_shown_v;
    calc_max_occurrence();
    count_var_occurrence();
  } else {
    links = cola_links = model_links; /// not a copy
    shown_v = [].concat(model_shown_v, data.constraint_nodes);
  }
  
}

function update_search(e){
  var name = e.target.value;
  if (name === "") name = "^$";
  try 
  {
    var re = new RegExp(name);
  } 
  catch (e)
  {
    // console.error("Invalid regular expression: ", name);
    return;
  }
  DrawingEngine.set_all_unhighlighted();
  DrawingEngine._filter_single_nodes().forEach(function (n) {
    if (re.test(n.name) || name == n.name)
      DrawingEngine.highlight_var(n);
  });
  DrawingEngine._update_highlighting();
}

function update_filter(e){
  apply_filter(e.target.valueAsNumber);
}

function apply_filter(value){
  var n_value = max_occurrence - value * max_occurrence / 100;
  links = cola_links = diff_links.filter(function (l) { return l.occurrence >= n_value; });
  update_filter_label(Math.round(n_value));
  de.draw();
}

function log_to_html(str){
  d3.select("body").append("p").text(str);
}

function echo(str){
  return str;
}

function initialize(file_path){

  // data.readNogoodsFile("data/golomb_ng_9.dat", process_nogoods);
  
  // data.readNogoodsFile("data/queens_ng.dat", process_nogoods);
  // data.readNogoodsFile("data/queen_cp2.dat", process_nogoods);
  // data.readNogoodsFile("data/maxim.dat", process_nogoods)
  // data.readFile("latinsquare.fzn", ready);
  // data.readFile("latinsquare_no_gecode.fzn", ready);
  // data.readFile("aust.fzn", ready);
  // data.readFile("alpha.fzn", ready);
  // data.readFile("money.fzn", ready);
  // data.readFile("simple1d.fzn", ready);
  // data.readFile("queen_cp2.fzn", ready);
  // data.readFile("golomb.fzn", ready);
  // data.readFile("open_stacks_01_max.fzn", ready);
  // data.readFile("open_stacks_01_maximum.fzn", ready);
  
  // data.readFile("bacp-1.fzn", ready);


}

function init_string(str) {
  de.init_svg();
  data.readString(str, constr_graph_ready);
}

function constr_graph_ready(){
  if (isRunInBrouser){
    console.log("global_v_names: ", data.global_v_names);
    console.log("all_v: ", data.all_v);
  }

  // option 1 for graph
  if (!difference_graph){
    construct_graph();
    apply_graph();
    de.draw();
  } else {
    construct_graph_o2();
  }

}

function expand_node(d){

  d.isCollapsed = false;
  construct_graph();
  de.draw();
}

function collapse_node(d){

  d.isCollapsed = true;
  construct_graph();
  de.draw();
}

function construct_graph_o2(){
  model_shown_v = [];
  if (model_shown_v.length === 0)
  for (var i in data.all_v){
    var v = data.all_v[i];
    v.type = "svar" // not always an svar, but for now displayed like it is
    model_shown_v.push(v);
  }

  create_links_o2();

}

function process_nogoods(lines){
  console.log("nogoods: ", lines);
}

function construct_graph(){
  // console.log("reconstruction");
  model_shown_v = [];
  if (model_shown_v.length === 0)
  for (var i in data.global_v_names){ // TODO: maybe no need for global_v?
    var v = data.global_v_names[i];
    if (v.type != "arr" || v.isCollapsed){
      model_shown_v.push(v);
    } else {

      model_shown_v.push(v);
    }
  }
  construct_cnodes();
  create_links();
}

// if I want to generate real nodes for array's elements
function generate_nodes_from_array(str, arr){
  if (arr.length === 1)
    for (var i = 1; i <= arr[0]; i++)
      model_shown_v.push({name: (str + i + "]")});
  else {
    arr.shift();
    for (var j = 1; j <= arr[0]; j++){
      generate_nodes_from_array(str + j + ",", arr);
    }
      
  }
}

function construct_cnodes(){
  // console.group("C_NODES");
  var name;
  var unique_constraints = {};
  data.constraint_nodes = [];
  for (var i in data.constraints){
    var cluster = {name:"", arr:{}};
    var c = data.constraints[i];
    cluster.type = c.name;
    cluster.name = c.name;
    for (var j in c.arr){
      // check if expanded array
      if (c.arr[j].host && c.arr[j].host.isCollapsed)
        name = c.arr[j].host.name;
      else
        name = c.arr[j].name;
      var obj = data.global_v_names[name];
      if (!obj) obj = data.all_v[name];
      cluster.arr[name] = obj; //!!!
      cluster.name += "_" + name;
      c.cnode = cluster;

    }
    unique_constraints[cluster.name] = cluster;
  }

  for (var k in unique_constraints){
    data.constraint_nodes.push(unique_constraints[k]);
  }
  // console.groupEnd();
}

function create_links_o2(){

  for (var i in data.constraints){
    var c = data.constraints[i];
    
    // for each variable in constraint
    for (var j = 0; j < c.arr.length; j++) 
      for (var k = j + 1; k < c.arr.length; k++){
        var link = {type: "straight", source: c.arr[j], length: 5};
        link.target = c.arr[k]
        link.real_target = c.arr[k];
        model_links.push(link);
      }

  }
}

function create_links(){
  for (var i in data.constraint_nodes){
    var c = data.constraint_nodes[i];

    for (var j in c.arr){
      var link = {type: "straight", source: c, length: 2};
      if (c.arr[j].host){
        link.target = c.arr[j].host; // for cola
        
        if (c.arr[j].host.isCollapsed === false){
          link.real_target = c.arr[j];
          link.length = 8;
        } else {
          link.real_target = c.arr[j].host;
        }
          
      }
      else {
         link.target = link.real_target = c.arr[j];
      }
        
      model_links.push(link);
    }
    
  }
}
function Tools(){}

/// to recursively parse strings with arrays 
Tools.parse_array_str = function(str){
  i = 0;
  start = 0;
  open_count = 0;
  closed_count = 0;
  var arr = [];
  for (var i = 0; i < str.length; i++){
    var has_inner_arrays = false;
    if (str[i] === "["){
      open_count++;
      if (open_count === 1)
        start = i;
      if (open_count > 1)
        has_inner_arrays = true;
      }
      else if (str[i] === "]")
        closed_count++;
      if ((closed_count !== 0) && (open_count === closed_count)){
          
        if (has_inner_arrays)
          arr.push(parse_array_str(str.substring(start + 1, i)));
        else {
          // arr.push(str.substring(start + 1, i).split(','));
          arr.push(str.substring(start + 1, i));
        }
                
        open_count = 0;
        closed_count = 0;
      }
  }
  return arr;
};

Tools.smart_split = function(str){
  i = 0;
  start = 0;
  open_count = 0;
  closed_count = 0;
  var arr = [];
  for (var i = 0; i < str.length; i++){
    if (str[i] === "[") {
      open_count++;
    }
    else if (str[i] === "]")
      closed_count++;
    else if (str[i] === "," && open_count === closed_count) {
      arr.push(str.substring(start, i));
      start = i + 1;
    }              
  }
  arr.push(str.substring(start));
  return arr;
}

Tools.removeBraces = function(str){
    return str.replace(/[\]\[]{1,}/gi, "");
};

Tools.removeOuterBraces = function(str){
    var str = str.match(/\[.+\]/)[0];
    return str.substring(1, str.length - 1)
}
