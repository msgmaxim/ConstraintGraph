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
  cola.nodes([].concat(data.constraint_nodes, shown_v)).links(links).start();

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
      .data(links.filter(function(d) { return (d.type === "straight"); }))
      .enter().append("line")
      .attr("class", "straight_link");

  edgesLayer.selectAll(".curved_link")
      .data(links.filter(function(d) { return (d.type === "curved"); }))
      .enter().append("ellipse")
      .attr("class", "curved_link");



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
        .append("title").text(function (d) { return d.name; });

  c_node.attr("d", function (d) {
    var h = 16;
    return str = "M " + d.x + " " + (d.y - h/2) + " l " + (h/2) + " " + (h) + " l " + (-h) + " " + ("0") + " z";
  })
  .append("title").text(function (d) { return d.type; });

  s_link.attr("x1", function (d) { return d.source.x; })
    .attr("y1", function (d) { return d.source.y; })
    .attr("x2", function (d) { return d.target.x; })
    .attr("y2", function (d) { return d.target.y; });

  q_link.attr("cx", function (d) { return (d.source.x + d.target.x)/2; })
        .attr("cy", function (d) { return (d.source.y + d.target.y)/2; })
        .attr("rx", function (d) { return 50; })
        .attr("ry", function (d) { return 10; })
        .attr("transform", "rotate(10)");

}




function apply_zooming(){
  vis.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
}

function construct_graph(){
  for (var i in data.global_v){
    var v = data.global_v[i];
    if (v.type != "arr" || v.isCollapsed){
      shown_v.push(v);
    } else {
      // TODO: add corresponding single variables
    }
  }
  construct_cnodes();
  create_links();
}

function construct_cnodes(){
  var name;
  var unique_constraints = {};
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
      cluster.arr[name] = data.global_v_names[name];
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
  for (var i in data.constraint_nodes){
    var c = data.constraint_nodes[i];
   
    if (Object.keys(c.arr).length == 1){
      var link = {};
      link.source = c;
      link.target = c.arr[Object.keys(c.arr)[0]];
      link.type = "curved";
      link.length = 0.8;
      links.push(link);
    } else {
      for (var j in c.arr){
        var link = {};
        link.type = "straight";
        link.source = c;
        link.target = c.arr[j];
        links.push(link);
      }
    }
    
  }
  console.log(links);
}