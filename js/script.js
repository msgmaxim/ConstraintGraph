window.addEventListener("load", init);

var data = new Data();
var de = new DrawingEngine();

var isRunInBrouser = true;


var constraint_shown_v = [];
var links = [];
var cola_links = [];
var shown_v = [];

var model_links = [];


function init(){

  document.getElementById("search_input").addEventListener("change", update_search);
  console.log(document.getElementById("search_input"));
  if (isRunInBrouser)
   // initialize('data/golomb_9.fzn');
   // initialize('data/queen_cp2.fzn');
   initialize('data/cars.fzn');
   // initialize('data/queen_cp2.fzn');
}

function update_search(e){
  var name = e.target.value;
  var re = new RegExp(name);
  DrawingEngine.unhighlight_all();
  shown_v.forEach(function (n) {
    if (re.test(n.name))
      DrawingEngine.highlight_var(n);
  })
}

function log_to_html(str){
  d3.select("body").append("p").text(str);
}

function echo(str){
  return str;
}

function initialize(file_path){

  // if (file_path !== undefined)
  //   log_to_html("file: " + file_path);
  de.init_svg();

/// work:

  data.readFile(file_path, ready);
  // data.readNogoodsFile("data/golomb_ng_9.dat", process_nogoods);
  data.readNogoodsFile("data/cars_mod.dat", process_nogoods);
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
  data.readString(str, ready);
}

function ready(){
  if (isRunInBrouser){
    console.log("global_v_names: ", data.global_v_names);
    console.log("all_v: ", data.all_v);
  }
   
  // console.log(data.constraints);

  // option 1 for graph
   //construct_graph();

  // option 2 gro graph
  construct_graph_o2();
  de.draw();
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
  constraint_shown_v = [];
  if (constraint_shown_v.length === 0)
  for (var i in data.all_v){
    var v = data.all_v[i];
    constraint_shown_v.push(v);
  }

  create_links_o2();

}

function process_nogoods(lines){
  console.log("nogoods: ", lines);
}

function construct_graph(){
  // console.log("reconstruction");
  constraint_shown_v = [];
  if (constraint_shown_v.length === 0)
  for (var i in data.global_v_names){ // TODO: maybe no need for global_v?
    var v = data.global_v_names[i];
    if (v.type != "arr" || v.isCollapsed){
      constraint_shown_v.push(v);
    } else {

      constraint_shown_v.push(v);
    }
  }
  construct_cnodes();
  create_links();
}

// if I want to generate real nodes for array's elements
function generate_nodes_from_array(str, arr){
  if (arr.length === 1)
    for (var i = 1; i <= arr[0]; i++)
      constraint_shown_v.push({name: (str + i + "]")});
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

  links = []; /// why links and cola_links?
  cola_links = [];

  for (var i in data.constraints){
    var c = data.constraints[i];
    
    // for each variable in constraint
    for (var j = 0; j < c.arr.length; j++) 
      for (var k = j + 1; k < c.arr.length; k++){
        var link = {type: "straight", source: c.arr[j], length: 5};
        link.target = c.arr[k]
        link.real_target = c.arr[k];
        // links.push(link);
        // cola_links.push(link);
        model_links.push(link);
      }

  }


  // for (var i in data.constraint_nodes){
  //   var c = data.constraint_nodes[i];

  //   for (var j in c.arr){
  //     var link = {type: "straight", source: c, length: 2};
  //     if (c.arr[j].host){
  //       link.target = c.arr[j].host; // for cola
        
  //       if (c.arr[j].host.isCollapsed === false){
  //         link.real_target = c.arr[j];
  //         link.length = 8;
  //       } else {
  //         link.real_target = c.arr[j].host;
  //       }
          
  //     }
  //     else {
  //        link.target = link.real_target = c.arr[j];
  //     }
        
  //     links.push(link);
  //     cola_links.push(link);
  //   }
    



  // }
}

function create_links(){
  // links = []; /// why links and cola_links?
  // cola_links = [];
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
        
      links.push(link);
      cola_links.push(link);
    }
    
  }
}