var vLayout = new VarLayout();

function VarLayout(){
  this.variables;
  this.new_variables;
  this.context;
  this.canvas;
  this.file_name;

  this.show_introduced = true;
}

var variables; // array
var map_varlits; // map
var map_var_name; // map

function read_variables(lines){ // !good
  variables = [];
  for (i in lines){
    // var index = lines[i].indexOf("FZN:");
    var index = lines[i].indexOf("INTVAR:"); // does it always have to be INTVAR?
    if (index < 0) continue;
      
    var pair = lines[i].substring(index + 7).trim().split(' ');
    variables[i] = {name: pair[0], id: i};
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