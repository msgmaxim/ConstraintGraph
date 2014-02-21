VarLayout.DISTANCE = 10;
NODE_SIZE = 10;
ELEMENT_DISTANCE = 5;
ARR_COLOR = "moccasin";
INT_ARR_COLOR = "green";


function VarLayout(){
	this.model_nodes = {};
	this.isReady = true;
}


VarLayout.prototype.init = function(){

	this.svg = d3.select("#v_layout").append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("preserveAspectRatio", "xMinYMin meet");
    this.vis = this.svg.append('g');
    this.svg.call(d3.behavior.zoom().on("zoom", (function(caller) {
        return function() {caller._apply_zooming.apply(caller, arguments);};
      })(this)));

	// this.canvas.addEventListener('mousedown', handle_dragndrop, false);
  	// this.canvas.addEventListener('mousewheel', handle_mousewheel, false);

	// this.canvas.width  = window.innerWidth * 0.3;
	 // this.canvas.height = window.innerHeight * 0.9;

	
};

VarLayout.prototype._apply_zooming = function(){
  // if (nodeMouseDown) return;
  this.vis.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
};

VarLayout.prototype.update_drawing = function(){

	// this.context.font = "bold 12px Arial";

	// var context = this.context;
	var variables = Data._self.global_v_names;

	// context.clearRect(0, 0, canvas.width / scale, canvas.height / scale);

	var x = VarLayout.DISTANCE + rel_x;
	var y = VarLayout.DISTANCE + rel_y;

	for (i in variables){
		var item = variables[i];
		item.x = x;
		item.y = y;

		if (item.type == "var")
			y = this.draw_var(item, x, y);
		else if (item.type == "arr"){
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
};

VarLayout.prototype.draw_one_dim_array = function(item, x, y){
	var vis = this.vis;

	y += NODE_SIZE;

	vis.append('text').attr('x', x - NODE_SIZE / 2)
					  .attr('y', y - NODE_SIZE)
					  .text(item.name);

	for (var j = 0; j < item.n[0]; j++){
		var rect = vis.append("rect").attr("class", "v_node")
    	   .attr("width", NODE_SIZE)
    	   .attr("height", NODE_SIZE)
    	   .attr("x", x - NODE_SIZE/2).attr("y", y - NODE_SIZE/2);

    	var name = item.name + "[" + (j + 1) + "]";

    	this.model_nodes[name] = rect[0][0];

		x += NODE_SIZE + ELEMENT_DISTANCE;
	}

	y += NODE_SIZE + VarLayout.DISTANCE * 1.5;
	
	return y;
};

VarLayout.prototype.draw_two_dim_array = function(item, x, y){
	var vis = this.vis;
	var init_x = x;

	y += NODE_SIZE;

	vis.append('text').attr('x', x - NODE_SIZE / 2)
					  .attr('y', y - NODE_SIZE)
					  .text(item.name);

	for (var i = 0; i < item.n[1]; i++){
		for (var j = 0; j < item.n[0]; j++){
			var rect = vis.append("rect").attr("class", "v_node")
    	   		.attr("width", NODE_SIZE)
    	   		.attr("height", NODE_SIZE)
    	   		.attr("x", x - NODE_SIZE/2).attr("y", y - NODE_SIZE/2);
			x += NODE_SIZE + ELEMENT_DISTANCE;

	    	var name = item.name + "[" + (i * item.n[0] + j + 1) + "]";
			this.model_nodes[name] = rect[0][0];
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

	// var horizontally = true;
	var horizontally = false;

	vis.append('text').attr('x', x - NODE_SIZE / 2)
					  .attr('y', y - NODE_SIZE)
					  .text(item.name);

	for (var i = 0; i < item.n[0]; i++){
		for (var j = 0; j < item.n[1]; j++){
			for (var k = 0; k < item.n[2]; k++){
				var rect = vis.append("rect").attr("class", "v_node")
    	   			.attr("width", NODE_SIZE)
    	   			.attr("height", NODE_SIZE)
    	   			.attr("x", x - NODE_SIZE/2).attr("y", y - NODE_SIZE/2);
				x += NODE_SIZE + ELEMENT_DISTANCE;

				var name = item.name + "[" + (i * item.n[1] * item.n[2] 
					+ j * item.n[2] + k + 1) + "]";
				this.model_nodes[name] = rect[0][0];
			}
			y += NODE_SIZE + ELEMENT_DISTANCE;

			if (j == item.n[1] - 1) {
				if (horizontally)
					init_x += item.n[2] * (NODE_SIZE + ELEMENT_DISTANCE) + VarLayout.DISTANCE;
				else
					y += VarLayout.DISTANCE;
			}

			x = init_x;
		}

		if (horizontally) 
			y = init_y;
		else
			x = init_x;

	}

	return init_y + item.n[1] * (NODE_SIZE + ELEMENT_DISTANCE) - ELEMENT_DISTANCE + VarLayout.DISTANCE * 1.5;


};