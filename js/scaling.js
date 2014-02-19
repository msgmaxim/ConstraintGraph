var SCALE_FACTOR = 1.1;
var scale = 1;
var rel_x = 0;
var rel_y = 0;

var me_prev_x = -1;
var me_prev_y = -1;

function handle_dragndrop(e){
	// console.log(e)
	document.onmousemove = function(e) {
		if (me_prev_x == -1)
			me_prev_x = e.x;
		else{
			rel_x -= (me_prev_x - e.x)/scale;
			me_prev_x = e.x;
		}

		if (me_prev_y == -1)
			me_prev_y = e.y;
		else{
			rel_y -= (me_prev_y - e.y)/scale;
			me_prev_y = e.y;
		}
		
		vLayout.update_drawing();
		// console.log(e);
  };

  document.onmouseup = function() {
  	me_prev_y = -1;
  	me_prev_x = -1;
    document.onmousemove = null;
  };
}

 function handle_mousewheel(e) {
  	// console.log("wheel!");
  	if (e.wheelDelta > 0){
  		vLayout.context.scale(SCALE_FACTOR, SCALE_FACTOR);
  		scale *= SCALE_FACTOR;
  	}
  	else{
  		vLayout.context.scale(1/SCALE_FACTOR, 1/SCALE_FACTOR);  
			scale *= 1/SCALE_FACTOR;
		}
  	vLayout.update_drawing();		

  }