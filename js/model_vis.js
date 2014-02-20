VarLayout.DISTANCE = 10;
NODE_SIZE = 10;
ELEMENT_DISTANCE = 5;
ARR_COLOR = "moccasin";
INT_ARR_COLOR = "green";


function VarLayout(){
	// this.variables;
	// this.new_variables;
	// this.context;
	// this.canvas;
	// this.file_name;

	// this.show_introduced = true;
}


VarLayout.prototype.init = function(){

	this.canvas = document.getElementById("canvas");
	this.context = canvas.getContext("2d");

	this.canvas.addEventListener('mousedown', handle_dragndrop, false);
  	this.canvas.addEventListener('mousewheel', handle_mousewheel, false);

	// this.canvas.width  = window.innerWidth * 0.3;
	 this.canvas.height = window.innerHeight * 0.9;

	
};

VarLayout.prototype.update_drawing = function(){

	this.context.font = "bold 12px Arial";

	var context = this.context;
	var variables = Data._self.global_v_names;

	context.clearRect(0, 0, canvas.width / scale, canvas.height / scale);

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
	var context = this.context;

	context.strokeStyle = "black";
	context.lineWidth = 1;
	context.fillStyle = "black";
	context.fillText(item.name, x, y + NODE_SIZE/2);
	y += NODE_SIZE;

	if (item.introduced == "true")
		context.fillStyle = INTR_ARR_COLOR;
	else
		context.fillStyle = ARR_COLOR;

	for (var j = 0; j < item.n[0]; j++){
		// context.strokeRect(x, y, NODE_SIZE, NODE_SIZE);
		context.fillRect(x, y, NODE_SIZE, NODE_SIZE);
		x += NODE_SIZE + ELEMENT_DISTANCE;
	}

	y += NODE_SIZE + VarLayout.DISTANCE;
	
	return y;
};

VarLayout.prototype.draw_two_dim_array = function(item, x, y){
	var context = this.context;
	var init_x = x;

	context.strokeStyle = "black";
	context.lineWidth = 1;
	context.fillStyle = "black";
	context.fillText(item.name, x, y + NODE_SIZE/2);
	y += NODE_SIZE;

	if (item.introduced == "true")
		context.fillStyle = INTR_ARR_COLOR;
	else
		context.fillStyle = ARR_COLOR;

	for (var i = 0; i < item.n[1]; i++){
		for (var j = 0; j < item.n[0]; j++){
			// context.strokeRect(x, y, NODE_SIZE, NODE_SIZE);
			context.fillRect(x, y, NODE_SIZE, NODE_SIZE);
			x += NODE_SIZE + ELEMENT_DISTANCE;
		}
		y += NODE_SIZE + ELEMENT_DISTANCE;
		x = init_x;
	}

	y += VarLayout.DISTANCE - ELEMENT_DISTANCE;

	return y;

	
};

VarLayout.prototype.draw_three_dim_array = function(item, x, y){
	var context = this.context;
	context.strokeStyle = "black";
	context.lineWidth = 1;
	context.fillStyle = "black";
	context.fillText(item.name, x, y + NODE_SIZE/2);
	y += NODE_SIZE;

	var init_x = x;
	var init_y = y;

	if (item.introduced == "true")
		context.fillStyle = INTR_ARR_COLOR;
	else
		context.fillStyle = ARR_COLOR;

	for (var i = 0; i < item.n[0]; i++){
		for (var j = 0; j < item.n[1]; j++){
			for (var k = 0; k < item.n[2]; k++){
				// context.strokeRect(x, y, NODE_SIZE, NODE_SIZE);
				context.fillRect(x, y, NODE_SIZE, NODE_SIZE);
				x += NODE_SIZE + ELEMENT_DISTANCE;
			}
			y += NODE_SIZE + ELEMENT_DISTANCE;

			if (j == item.n[1] - 1) init_x += item.n[2] * (NODE_SIZE + ELEMENT_DISTANCE) + VarLayout.DISTANCE;

			x = init_x;
		}
		y = init_y;

	}

	return init_y + item.n[1] * (NODE_SIZE + ELEMENT_DISTANCE) - ELEMENT_DISTANCE + VarLayout.DISTANCE;


};