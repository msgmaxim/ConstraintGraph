Data.Profiling = true;
Data.LogParsing = true;

function Data(){
  Data._self = this; // not sure if is needed
  this.global_v = []; // var/array
  this.global_v_names = {}; // map (var/array)name -> var/array
  this.all_v = {}; // map varname -> var
  this.constraints = [];
  this.constraint_nodes = [];
}

Data.prototype.readFile = function (file_name, callback){
  var req = new XMLHttpRequest();
  var ajaxURL = '../data/' + file_name;
  ajaxURL += "?noCache=" + (new Date().getTime()) + Math.random();

  req.open('get', ajaxURL, false);
  req.onload = (function(caller) {
        return function() {caller._initModel.apply(caller, [arguments[0], callback]);};
      }
    )(this);
  req.send();
};

Data.prototype._initModel = function(data, callback){

  if (Data.Profiling) console.time("Parsing time: ");

  var lines = data.target.response.trim().split('\n');
  
  this._parseVariables(lines.filter(Data._isSingleVar).filter(Data._isVariable));
  this._parseArrays(lines.filter(Data._isArray).filter(Data._isVariable));
  this._parseConstraints(lines.filter(Data._isConstraint));
  this._loopConstraints();

  if (Data.Profiling) console.timeEnd("Parsing time: ");
  callback();
};

Data._isVariable = function(str){
  if (str.split(' ').indexOf("var") !== -1)
    return true;
  return false;
};

Data._isSingleVar = function(str){
  if (str.split(' ')[0] === "var")
    return true;
  return false;
};

Data._isArray = function(str){
  if (str.split(' ')[0] === "array")
    return true;
  return false;
};

Data._isConstraint = function(str){
  if (str.split(' ')[0] === "constraint")
    return true;
  return false;
};

Data.prototype._parseConstraints = function(arr){
  if (Data.LogParsing) console.groupCollapsed("Constraint Strings");
  for (var i = 0; i < arr.length; i++){
    if (Data.LogParsing) console.log("parsed constraints: ", arr[i]);

    var c = Data._parseConstraint(arr[i]);
    this.constraints.push(c);  
  }

  if (Data.LogParsing) console.groupEnd();
  // console.log(this.constraints);
};

Data._parseConstraint = function(str){
  var c = {name: "", arr: []};

  var str = str.substring("constraint ".length); // really needed?
  var b1 = str.indexOf('(');
  var b2 = str.indexOf(')');
  c.name = str.substring(0, b1);
  str = str.substring(b1 + 1, b2).trim();

  if (str.charAt(0) === "[" && str.charAt(str.length - 1) === "]"){   /// "[a, b, c]"
    str = str.substring(1, str.length - 1);                           /// "a, b, c"
  } else {
    var structure = Tools.parse_array_str(str);

        /// TODO: make more use of Tools
    if (c.name === "int_lin_eq")
    {
      str = structure[1];
    } else if (c.name === "array_bool_and"){
      str = Tools.removeBraces(str);
    }
  }

  var vars = str.replace(/[ ]{1,}/gi, "").split(',');
  if (c.name === "int_eq")
    c.arr = [vars[0]];
  else
    c.arr = vars;
  
  return c;
};

Data.prototype._loopConstraints = function(){
  for (var i = 0; i < this.constraints.length; i++){
    var c = this.constraints[i];
    for (var j = 0; j < c.arr.length; j++){
      var v = this.all_v[c.arr[j]];
      if (!v) {  /// array name?
        v = this.global_v_names[c.arr[j]];
        /// assign all variables
        for (e in v.vars){
          v.vars[e].constraints.push(c);
          v.vars[e].host.constraints.push(c);
          // c.arr.push(v.vars[e]);
        }
        c.arr = v.vars;
        /// TODO: sometimes we should not break
        break;
        
      } else { /// not an array name
        v.constraints.push(c);
        if (v.host)
          v.host.constraints.push(c);
        c.arr[j] = v;
      }
    }
  }
};

Data.prototype._parseVariables = function(arr){
  for (var i = 0; i < arr.length; i++){
    if (Data.LogParsing) console.log("parsed varialbes: ", arr[i]);
    var v = {};
    v.name = arr[i].substring(arr[i].indexOf(':') + 1).match(/[a-zA-z_0-9]+/)[0];
    v.constraints = [];
    // if introduced
    if (arr[i].indexOf("introduced") !== -1){
      v.type = "svar"; // single variable
      this.global_v.push(v);
    } else { // not introduced
      v.type = "svar"; // single variable
      this.global_v.push(v);
    }
    this.global_v_names[v.name] = v;
    v.isCollapsed = true;
    this.all_v[v.name] = v;
  }
};

Data.prototype._parseArrays = function(arr){
  for (var i = 0; i < arr.length; i++){
    if (Data.LogParsing) console.log("parsed arrays: ", arr[i]);
    var a = {};

    var structure = Tools.parse_array_str(arr[i]);
    var hasAnnotation = arr[i].indexOf('::') === -1 ? false : true;

    var rest = arr[i].substring(arr[i].indexOf(':') + 1).trim();
    a.name = rest.match(/[a-zA-z_0-9]*/)[0];
    a.type = "arr"; /// shared
    a.isCollapsed = true; /// shared
    a.constraints = [];
    a.vars = [];

    // if dimentions mentioned
    var b1 = rest.indexOf('(');
    var b2 = rest.indexOf(')');

    if (rest.indexOf('introduced') !== -1 || (structure[1] && structure[1].indexOf('..') === -1)) { // introduced variables
      a.dims = 1;
      b1 = rest.indexOf('[');
      b2 = rest.indexOf(']');

      rest = rest.substring(b1 + 1, b2);
      var vars = rest.replace(/[ ]{1,}/gi, "").split(',');
      for (var q = 0; q < vars.length; q++)
      {

        var v = this.all_v[vars[q]];
        this.global_v.splice(v);
        v.host = a;
        v.real_name = v.name;
        v.constraints = [];
        a.vars.push(v);
      }
      a.n = [vars.length];
    } else { // not introduced variables
      if (hasAnnotation)
        rest = rest.substring(b1 + 2, b2 - 1);
      else
        rest = structure[0];
      var dims = rest.split(',');
      a.dims = dims.length;
      a.n = [];

      var count = 1;
      for (var j = 0; j < dims.length; j++){
        a.n[j] = parseInt(dims[j].match(/[0-9]*$/)[0], 10);
        count *= a.n[j];
      }

      // creating array elements
      for (var k = 1; k <= count; k++){
        var name = a.name + "[" + k + "]";
        var obj = {host:a, name:name, constraints: []};
        a.vars.push(obj);
        this.all_v[name] = obj;
      }
    }

       // TODO: make for all dimentions
    if (a.dims === 2){
     a.w = (DrawingEngine.PADDING + DrawingEngine.VAR_SIZE) * a.n[1] + DrawingEngine.PADDING;
     a.h = (DrawingEngine.PADDING + DrawingEngine.VAR_SIZE) * a.n[0] + DrawingEngine.PADDING;
    } else if (a.dims === 1){
      a.w = (DrawingEngine.PADDING + DrawingEngine.VAR_SIZE) * a.n[0] + DrawingEngine.PADDING;
      a.h = (DrawingEngine.PADDING + DrawingEngine.VAR_SIZE);
    }

    // console.log(a);

    this.global_v_names[a.name] = a;
    this.global_v.push(a);
  }
};