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
    variables[i] = {name: pair[0], id: i};
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
      arr.push(map_varlits[Math.abs(parseInt(clause[j]))]);
    }
    clauses.push(arr);
  

  }

  console.log("--- clauses have been read", clauses);
}

function generate_vars(){
  vLayout.new_variables = {};
  console.log(variables);
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
  console.log(vLayout.new_variables);
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
        if (clauses[i][j] == undefined)
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

  if( links_map[v1 + " " + v2] == undefined) {
    
    link = {};
    var1 = variables[parseInt(v1)];
    var2 = variables[parseInt(v2)];
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