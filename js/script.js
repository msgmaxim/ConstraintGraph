window.addEventListener("load", init);

var width = window.innerWidth,
    height = window.innerHeight;
var cola = cola.d3adaptor().linkDistance(40).size([]);

var svg;
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
	cola.nodes([shown_v, data.constraint_nodes]).links([links]).start();

  var v_nodes = nodesLayer.selectAll(".v_node")
    .data(shown_v.filter(function(v) {
      return (v.type !== "arr");

    }))
    .enter().append("circle")
    .attr("class", "node")
    .attr("r", VAR_SIZE / 2)
    .attr("cx", function(d, i) {return 50 + 25 * i;})
    .attr("cy", 50);

  var a_nodes = nodesLayer.selectAll(".a_node")
    .data(shown_v.filter(function(v) {return (v.type === "arr");}))
    .enter().append("rect")
    .attr("class", "node")
    .attr("width", ARR_SIZE)
    .attr("height", ARR_SIZE)
    .attr("x", function(d, i) {return 50 + 35 * i - ARR_SIZE / 2;})
    .attr("y", 120);

  var c_nodes = nodesLayer.selectAll(".c_node")
		.data(data.constraint_nodes)
		.enter().append("path")
		.attr("class", "c_node")
		.attr("d", function(d,i) {
			var cx = 50 + 20 * i;
			var cy = 80;
			var edge = 16;
			var h = 1 * edge;
			return "M " + cx + " " + (cy - h/2) + " l " + (edge/2) + " " + (h) + " l " + (-edge) + " " + ("0") + " z";
		});
		// .attr("r", C_SIZE / 2)
		// .attr("cx", function(d, i) {return 50 + 20 * i;})
		// .attr("cy", 80);
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
	var unique_constraints = {}
	for (var i in data.constraints){
		var cluster = {name:"", arr:{}};
		var c = data.constraints[i];
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
		
		for (var j in c.arr){
			var link = {};
			link.source = c;
			link.target = c.arr[j];
			link.length = 1;
			link.value = 1;
			links.push(link);
		}
		
		
	}
	console.log(links);
}