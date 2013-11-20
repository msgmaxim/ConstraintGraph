window.addEventListener("load", init);


var data = new Data();
var de = new DrawingEngine();


var shown_v = [];
var links = [];
var cola_links = [];

function init(){
  de.init_svg();
  data.readFile("not_so_many_clean.fzn", ready);
}

function ready(){
  // console.log(data.global_v);
  // console.log(data.all_v);
  // console.log(data.constraints);
  construct_graph();
  de.draw();
}

function expand_node(d){
  d.isCollapsed = false;
  construct_graph();
  de.draw();
  // console.log(d);
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
      // var n = 1;
      // for (var j = 0; j < v.dims; j++)
      //   n *= v.n[j];
      // for (var k = 1; k <= n; k++)
      //   shown_v.push(data.all_v[v.name + "[" + k + "]"]);
      shown_v.push(v);
    }
  }
  construct_cnodes();
  create_links();
}

// if I want to generate real nodes for array's elements
function generate_nodes_from_array(str, arr){
  if (arr.length === 1)
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
}

function create_links(){
  links = [];
  cola_links = [];
  for (var i in data.constraint_nodes){
    var c = data.constraint_nodes[i];

    for (var j in c.arr){
      var link = {type: "straight", source: c, length: 2};
      if (c.arr[j].host){
        link.target = c.arr[j].host;
        if (c.arr[j].host.isCollapsed === false)
          link.length = 8;
      }
      else
        link.target = c.arr[j];
      links.push(link);
      cola_links.push(link);
    }

    
  }
}