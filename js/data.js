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
	var lines = data.target.response.trim().split('\n');
	this._parseConstraints(lines.filter(Data._isConstraint));
	this._parseVariables(lines.filter(Data._isVariable));
	this._parseArrays(lines.filter(Data._isArray));

	this._loopConstraints();
	callback();
};

Data._isVariable = function(str){
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
	for (var i = 0; i < arr.length; i++){
		var str = arr[i].substring("constraint ".length);
		var b1 = str.indexOf('(');
		var b2 = str.indexOf(')');
		var name = str.substring(0, b1);
		str = str.substring(b1 + 1, b2).trim();
		if (str.charAt(0) === "[" && str.charAt(str.length - 1) === "]")
			str = str.substring(1, str.length - 1);
		var vars = str.replace(/[ ]{1,}/gi, "").split(',');
		this.constraints.push({name: name, arr: vars});
		
	}
};

Data.prototype._loopConstraints = function(){
	for (var i = 0; i < this.constraints.length; i++){
		var c = this.constraints[i];
		for (var j = 0; j < c.arr.length; j++){
			var v = this.all_v[c.arr[j]];
			v.constraints.push(c);
			if (v.host)
				v.host.constraints.push(c);
			c.arr[j] = v;
		}
	}
};

Data.prototype._parseVariables = function(arr){
	for (var i = 0; i < arr.length; i++){
		var v = {};
		v.name = arr[i].substring(arr[i].indexOf(':') + 1).match(/[a-zA-z_0-9]+/)[0];
		this.global_v_names[v.name] = v;
		v.constraints = [];
		v.type = "svar"; // single variable
		v.isCollapsed = true;
		this.global_v.push(v);
		this.all_v[v.name] = v;
	}
};

Data.prototype._parseArrays = function(arr){
	for (var i = 0; i < arr.length; i++){
		var a = {};

		var rest = arr[i].substring(arr[i].indexOf(':') + 1).trim();
		a.name = rest.match(/[a-zA-z_0-9]*/)[0];
		var b1 = rest.indexOf('(');
		var b2 = rest.indexOf(')');
		rest = rest.substring(b1 + 2, b2 - 1);
		var dims = rest.split(',');
		a.dims = dims.length;
		a.n = [];
		a.type = "arr";
		a.isCollapsed = true;

		var count = 1;
		for (var j = 0; j < dims.length; j++){
			a.n[j] = parseInt(dims[j].match(/[0-9]*$/)[0], 10);
			count *= a.n[j];
		}
		a.constraints = [];

		for (var k = 1; k <= count; k++){
			var name = a.name + "[" + k + "]";
			this.all_v[name] = {host:a, name:name, constraints: []};
		}

				// TODO: make for all dimentions
		if (a.dims === 2){
			a.w = (DrawingEngine.PADDING + DrawingEngine.VAR_SIZE) * a.n[1] + DrawingEngine.PADDING;
			a.h = (DrawingEngine.PADDING + DrawingEngine.VAR_SIZE) * a.n[0] + DrawingEngine.PADDING;
		}

		this.global_v_names[a.name] = a;
		this.global_v.push(a);
	}
};