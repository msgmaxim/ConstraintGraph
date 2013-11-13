window.addEventListener("load", init);

var width = window.innerWidth,
    height = window.innerHeight;
var cola = cola.d3adaptor().linkDistance(40).size([]);

var svg;
var edgesLayer;
var nodesLayer;

var data = new Data();
var shown_v = [];

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
  var v_nodes = nodesLayer.selectAll(".node")
    .data(shown_v)
    .enter().append("circle")
    .attr("class", "node")
    .attr("r", 6)
    .attr("cx", function(d, i) {return 50 + 20 * i;})
    .attr("cy", 50);

  var c_nodes = nodesLayer.selectAll(".c_node")
		.data(data.constraint_nodes)
		.enter().append("circle")
		.attr("class", "c_node")
		.attr("r", 3)
		.attr("cx", function(d, i) {return 50 + 20 * i;})
		.attr("cy", 80);
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
}