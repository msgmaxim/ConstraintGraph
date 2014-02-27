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


function init(){
  de.init_svg();
  document.getElementById("search_input").addEventListener("input", update_search);
  document.getElementById("filter_range").addEventListener("mouseup", update_filter);
  document.getElementById("splitter").addEventListener('mousedown', move_splitter);
  document.getElementById("rotate_btn").addEventListener('click', rotate_vlayout);
  document.getElementById("content").addEventListener('mousedown', content_mdown);
  document.getElementById("content").addEventListener('mouseup', content_mup);

  console.log(document.getElementById("search_input"));
  if (isRunInBrouser)
    // run_graph('data/cars.fzn')
    // run_graph('data/cars.fzn', 'data/cars_mod.dat')
    // run_graph('data/queen_cp2.fzn', 'data/queens_ng.dat');
    // run_graph('data/golomb_9.fzn', 'data/golomb_ng_9.dat');
    // run_graph('data/radiation.fzn', 'data/radiation_ng.dat');
    run_graph('data/radiation_04.fzn', 'data/radiation_04_ng.dat');

}

function content_mdown(e) {
  if (e.shiftKey)
    nodeMouseDown = true; // not really a nodeMouseDown event;
}

function content_mup(e) {
  if (e.shiftKey)
    nodeMouseDown = false; // not really a nodeMouseDown event;
}

function rotate_vlayout(){
  vLayout.horizontally = !vLayout.horizontally;
  vLayout.update_drawing();
  DrawingEngine._update_highlighting();
}

function move_splitter(e){
  document.onmousemove = function(e) {
    d3.select('#v_layout').style("width", e.x - 20 + "px");
    console.log();
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
  var max_occurrence = diff_links.reduce(function (a, b) { 
    return a > b.occurrence ? a : b.occurrence;
  });  
  var n_value = max_occurrence - value * max_occurrence / 100;
  links = cola_links = diff_links.filter(function (l) { return l.occurrence >= n_value; });
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