VarLayout.DISTANCE = 10;
NODE_SIZE = 10;
ELEMENT_DISTANCE = 5;
ARR_COLOR = "moccasin";
INT_ARR_COLOR = "green";


function VarLayout(){
	VarLayout._self = this;
	this.model_nodes = {};
	this.isReady = true;
	this.horizontally = false;
	this.height = window.innerHeight - 20;
}

VarLayout.prototype.mark_hidden = function() {
	for (var i = 0; i < shown_v.length; i++) {
		var v = shown_v[i];
		if (!v.has_links) {
			d3.select(vLayout.model_nodes[v.name])
			  .attr("style", function (d) {return "stroke: lightgrey";});
		}
	}

	VarLayout.applyColors();
};

VarLayout.applyColors = function() {
	shown_v.filter(function (v) { return v.has_links; })
		   .forEach( function (v) {
		   		d3.select(vLayout.model_nodes[v.name])
			  	  .attr("style", function (d) {return "fill: " + VarLayout.getRandomColor(v);});
		   });
};


VarLayout.prototype.init = function(){

	this.svg = d3.select("#v_layout").append("svg")
      .attr("height", this.height);
    this.vis = this.svg.append('g').attr('class', 'vlayout_vis');
    this.svg.call(d3.behavior.zoom().on("zoom", (function(caller) {
        return function() {caller._apply_zooming.apply(caller, arguments);};
      })(this)));

	// this.canvas.addEventListener('mousedown', handle_dragndrop, false);
  	// this.canvas.addEventListener('mousewheel', handle_mousewheel, false);

	// this.canvas.width  = window.innerWidth * 0.3;
	 // this.canvas.height = window.innerHeight * 0.9;

	
};

VarLayout.prototype._apply_zooming = function(){
  if (nodeMouseDown) return;
  this.vis.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
};

VarLayout.prototype.update_drawing = function(){

	
	var variables = Data._self.global_v_names;

	d3.selectAll(".vl_node").remove();
	d3.selectAll(".vl_label").remove();

	var x = VarLayout.DISTANCE + rel_x;
	var y = VarLayout.DISTANCE + rel_y;

	for (i in variables){
		var item = variables[i];
		item.x = x;
		item.y = y;

		if (item.type == "var")
			y = this.draw_var(item, x, y);
		else if (item.type == "arr"){

			VarLayout._drawLabel(this.vis, item.name, x, y); // adding array labels to vis

			switch(item.n.length){
				case 1:
					y = this.draw_one_dim_array(item, x, y);
				break;
				case 2:
					y = this.draw_two_dim_array(item, x, y);
				break;
				case 3:
					y = this.draw_three_dim_array(item, x, y);
				break;

			}
		}

	}

	this.mark_hidden();
};

VarLayout._drawLabel = function (vis, text, x, y) {
	vis.append('text')
		.attr('x', x - NODE_SIZE / 2)
		.attr('y', y)
		.attr('class', 'vl_label')
		.text(text);
};

VarLayout._getRelPosition = function ( ) {
	// ...
};

VarLayout.prototype._put_node = function (name, x, y){

	x = x - NODE_SIZE/2;
	y = y - NODE_SIZE/2;

	var rect = this.vis.append("rect").attr("class", "vl_node")
    	.attr("width", NODE_SIZE)
    	.attr("height", NODE_SIZE)
    	.attr("x", x).attr("y", y);
    	// .style('fill', VarLayout.getRandomColor(var_map[name]));

    rect[0][0].addEventListener('click', function (e){
    	// var v = VarLayout._self.svg_to_var[d.target];
    	var v = e.target.variable;
    	DrawingEngine.toggle_highlight_var(v);
    })

    this.model_nodes[name] = rect[0][0];
    rect[0][0].variable = var_map[name];
    // this.svg_to_var[rect[0][0]] = data.all_v[name];
};

VarLayout.getRandomColor = function(d) {
	if (d === undefined)
		return 'white';

	var b = 0.1 + Math.sqrt((d.occurs - min_occurrence) / (max_occurrence - min_occurrence));
	var color = 'rgba(' + 25 +',' + 25 + ',' + 255 + ',' + b + ')';
	console.log(color);
	return color;
};

VarLayout.prototype.draw_one_dim_array = function(item, x, y){
	var vis = this.vis;

	y += NODE_SIZE;

	for (var j = 0; j < item.n[0]; j++){

    	var name = item.name + "[" + (j + 1) + "]";
    	this._put_node(name, x, y);

		x += NODE_SIZE + ELEMENT_DISTANCE;
	}

	y += NODE_SIZE + VarLayout.DISTANCE * 1.5;
	
	return y;
};

VarLayout.prototype.draw_two_dim_array = function(item, x, y){
	var vis = this.vis;
	var init_x = x;

	y += NODE_SIZE;

	for (var i = 0; i < item.n[1]; i++){
		for (var j = 0; j < item.n[0]; j++){
			
	    	var name = item.name + "[" + (i * item.n[0] + j + 1) + "]";
	    	this._put_node(name, x, y);

	    	x += NODE_SIZE + ELEMENT_DISTANCE;

		}
		y += NODE_SIZE + ELEMENT_DISTANCE;
		x = init_x;
	}

	y += VarLayout.DISTANCE * 1.5 - ELEMENT_DISTANCE;

	return y;

	
};

VarLayout.prototype.draw_three_dim_array = function(item, x, y){
	var vis = this.vis;
	y += NODE_SIZE;

	var init_x = x;
	var init_y = y;

	for (var i = 0; i < item.n[0]; i++){
		for (var j = 0; j < item.n[1]; j++){
			for (var k = 0; k < item.n[2]; k++){

				var name = item.name + "[" + (i * item.n[1] * item.n[2] 
					+ j * item.n[2] + k + 1) + "]";

    	   		this._put_node(name, x, y);

				x += NODE_SIZE + ELEMENT_DISTANCE;
			}
			y += NODE_SIZE + ELEMENT_DISTANCE;

			if (j == item.n[1] - 1) {
				if (this.horizontally)
					init_x += item.n[2] * (NODE_SIZE + ELEMENT_DISTANCE) + VarLayout.DISTANCE;
				else
					y += VarLayout.DISTANCE;
			}

			x = init_x;
		}

		if (this.horizontally) 
			y = init_y;
		else
			x = init_x;

	}

	return init_y + item.n[1] * (NODE_SIZE + ELEMENT_DISTANCE) - ELEMENT_DISTANCE + VarLayout.DISTANCE * 1.5;


};