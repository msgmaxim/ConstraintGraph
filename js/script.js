window.addEventListener("load", init);

var width = window.innerWidth,
    height = window.innerHeight;
var cola = cola.d3adaptor().linkDistance(50).size([width, height]);

var svg;
var vis;
var edgesLayer;
var nodesLayer;

var VAR_SIZE = 20;
var ARR_SIZE = 30;
var C_SIZE = 12;


var data = new Data();
var shown_v = [];
var links = [];
var cola_links = [];

function init(){
  init_svg();
  data.readFile("not_so_many_clean.fzn", ready);
}


function init_svg(){
  if (!svg) {
    svg = d3.select("#content").append("svg").attr("width", width).attr("height", height);
    svg.call(d3.behavior.zoom().on("zoom", apply_zooming));
    vis = svg.append('g');

    edgesLayer = vis.append("g");
    nodesLayer = vis.append("g");
  }
}

function ready(){
  console.log(data.global_v);
  console.log(data.all_v);
  console.log(data.constraints);
  construct_graph();
  draw();
}

function draw(){
  cola.nodes([].concat(data.constraint_nodes, shown_v)).links(cola_links).start();

  var v_nodes = nodesLayer.selectAll(".v_node")
    .data(shown_v.filter(function(v) {
      return (v.type !== "arr");

    }))
    .enter().append("circle")
    .attr("class", "v_node")
    .attr("r", VAR_SIZE / 2);

  var a_nodes = nodesLayer.selectAll(".a_node")
    .data(shown_v.filter(function(v) {return (v.type === "arr");}))
    .enter().append("rect")
    .attr("class", "a_node")
    .attr("width", ARR_SIZE)
    .attr("height", ARR_SIZE);

  var c_nodes = nodesLayer.selectAll(".c_node")
    .data(data.constraint_nodes)
    .enter().append("path")
    .attr("class", "c_node");

  var link = edgesLayer.selectAll(".straight_link")
      .data(links)
      .enter().append("line")
      .attr("class", "straight_link");

    cola.on("tick", update_drawing);
}

function update_drawing(){
  var v_node = nodesLayer.selectAll(".v_node");
  var c_node = nodesLayer.selectAll(".c_node");
  var a_node = nodesLayer.selectAll(".a_node");
  var s_link = edgesLayer.selectAll(".straight_link");
  var q_link = edgesLayer.selectAll(".curved_link");

  v_node.attr("cx", function (d) { return d.x; })
        .attr("cy", function (d) { return d.y; })
        .append("title").text(function (d) { return d.name; });

  a_node.attr("x", function (d) { return d.x - ARR_SIZE/2; })
        .attr("y", function (d) { return d.y - ARR_SIZE/2; })
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
}

function apply_zooming(){
  vis.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
}

function expand_node(d){
  d.isCollapsed = false;
  construct_graph();
  draw();
  console.log(d);
}

function construct_graph(){
  console.log("reconstruction");
  shown_v = [];
  for (var i in data.global_v){
    var v = data.global_v[i];
    if (v.type != "arr" || v.isCollapsed){
      shown_v.push(v);
    } else {
      // TODO: add corresponding single variables
      // generate_nodes_from_array(v.name + "[", v.n);
      // shown_v.push(v);
      var n = 1;
      for (var j = 0; j < v.dims; j++)
        n *= v.n[j];
      for (var k = 1; k <= n; k++)
        shown_v.push(data.all_v[v.name + "[" + k + "]"]);
    }
  }
  construct_cnodes();
  create_links();
}

// if I want to generate real nodes for array's elements
function generate_nodes_from_array(str, arr){
  if (arr.length == 1)
    for (var i = 1; i <= arr[0]; i++)
      shown_v.push({name: (str + i + "]")});
  else {
    arr.shift();
    for (var j = 1; j <= arr[0]; j++){
      generate_nodes_from_array(str + j + ",", arr);
    }
      
  }
}

function construct_cnodes(){
  var name;
  var unique_constraints = {};
  data.constraint_nodes = [];
  for (var i in data.constraints){
    var cluster = {name:"", arr:{}};
    var c = data.constraints[i];
    cluster.type = c.name;
    for (var j in c.arr){
      // check if expanded array
      if (c.arr[j].host && c.arr[j].host.isCollapsed)
        name = c.arr[j].host.name;
      else
        name = c.arr[j].name;
      var obj = data.global_v_names[name];
      if (!obj) obj = data.all_v[name];
      cluster.arr[name] = obj; //!!!
      cluster.name += name + "_";

    }
    unique_constraints[cluster.name] = cluster;
  }

  for (var k in unique_constraints){
    data.constraint_nodes.push(unique_constraints[k]);
  }
  console.log(data.constraint_nodes);
}

function create_links(){
  links = [];
  cola_links = [];
  for (var i in data.constraint_nodes){
    var c = data.constraint_nodes[i];

    for (var j in c.arr){
      var link = {};
      link.type = "straight";
      link.source = c;
      link.target = c.arr[j];
      links.push(link);
      cola_links.push(link);
    }

    
  }
  console.log(links);
}