window.addEventListener("load", init);

var global_v = []; // var/array
var global_v_names = {}; // map (var/array)name -> var/array
var all_v = {}; // map varname -> var
var constraints = [];
var constraint_nodes = [];

var width = window.innerWidth,
    height = window.innerHeight;
var cola = cola.d3adaptor().linkDistance(40).size([]);

var svg;
var edgesLayer;
var nodesLayer;

function init(){
	read_data();
}

function read_data(){
	var req = new XMLHttpRequest();
	// var file_name = "gecode_latinsquare_clean.fzn";
	var file_name = "not_so_many_clean.fzn";
  var ajaxURL = '../data/' + file_name;
  ajaxURL += "?noCache=" + (new Date().getTime()) + Math.random();

  req.open('get', ajaxURL, false);
  req.onload = init_model;
  req.send();
}

function init_svg(){
	if (!svg) {
		svg = d3.select("#content").append("svg").attr("width", width).attr("height", height);
		vis = svg.append('g');

    edgesLayer = vis.append("g");
    nodesLayer = vis.append("g");
	}
}

function draw(){
  var v_nodes = nodesLayer.selectAll(".node")
    .data(global_v)
    .enter().append("circle")
    .attr("class", "node")
    .attr("r", 6)
    .attr("cx", function(d, i) {return 50 + 20 * i;})
    .attr("cy", 50);

  var c_nodes = nodesLayer.selectAll(".c_node")
		.data(constraint_nodes)
		.enter().append("circle")
		.attr("class", "c_node")
		.attr("r", 3)
		.attr("cx", function(d, i) {return 50 + 20 * i;})
		.attr("cy", 80);


}


function init_model(data){
	var lines = data.target.response.trim().split('\n');
	parse_constraints(lines.filter(is_constraint));
	parse_variables(lines.filter(is_variable));
	parse_arrays(lines.filter(is_array));

	loop_constraints();

	console.log(global_v);
	console.log(all_v);
	console.log(constraints);
	init_svg();
	draw();
}


function is_variable(str){
	if (str.split(' ')[0] === "var")
		return true;
	return false;
}

function is_array(str){
	if (str.split(' ')[0] === "array")
		return true;
	return false;
}

function is_constraint(str){
	if (str.split(' ')[0] === "constraint")
		return true;
	return false;
}

function parse_constraints(arr){
	for (var i in arr){
		var str = arr[i].substring("constraint ".length);
		var b1 = str.indexOf('(');
		var b2 = str.indexOf(')');
		var name = str.substring(0, b1);
		str = str.substring(b1 + 1, b2).trim();
		if (str.charAt(0) === "[" && str.charAt(str.length - 1) === "]")
			str = str.substring(1, str.length - 1);
		console.log(str);
		var vars = str.replace(/[ ]{1,}/gi, "").split(',');
		constraints.push({name: name, arr: vars});
		
	}
}

function loop_constraints(){
	for (var i in constraints){
		var c = constraints[i];
		for (var j in c.arr){
			all_v[c.arr[j]].constraints.push(c);
			if (all_v[c.arr[j]].host)
				all_v[c.arr[j]].host.constraints.push(c);
			c.arr[j] = all_v[c.arr[j]];
		}
	}
}

function parse_variables(arr){
	for (var i in arr){
		var v = {};
		v.name = arr[i].substring(arr[i].indexOf(':') + 1).match(/[a-zA-z_0-9]+/)[0];
		global_v_names[v.name] = v;
		v.constraints = [];
		global_v.push(v);
		all_v[v.name] = v;
	}
}

function parse_arrays(arr){
	for (var i in arr){
		var a = {};

		var rest = arr[i].substring(arr[i].indexOf(':') + 1).trim();
		a.name = rest.match(/[a-zA-z_0-9]*/)[0];
		var b1 = rest.indexOf('(');
		var b2 = rest.indexOf(')');
		rest = rest.substring(b1 + 2, b2 - 1);
		var dims = rest.split(',');
		a.dims = dims.length;
		a.n = [];
		var count = 1;
		for (var j in dims){
			a.n[j] = parseInt(dims[j].match(/[0-9]*$/)[0], 10);
			count *= a.n[j];
		}
		a.constraints = [];

		for (var k = 1; k <= count; k++){
			var name = a.name + "[" + k + "]";
			all_v[name] = {host:a, name:name, constraints: []};
		}
		global_v_names[a.name] = a;
		global_v.push(a);
	}
}