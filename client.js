var cu;
var ai0;
$(function() {
    Info.register("info");
    Info.run();
    Input.set_canvas_offset(parseInt($("#screen").css("left")), parseInt($("#screen").css("top")));
    Input.init();
    cu = new CanvasUtil();
    cu.register_canvas($("#screen")[0]);

    var player = new Agent([200, 200], 0);
    Agent.set_controlled_agent(player);

    ai0 = new Agent([400, 200], 0);

    function display_loop() {
        cu.clear();
        Agent.controlled_agent.draw();
        ai0.draw();
        setTimeout(display_loop, 50);
    }

    function control_loop() {
        Agent.controlled_agent.control_tick();
        setTimeout(control_loop, 50);
    }

    /*
    display_loop();
    control_loop();
    */

    var pts = [[100, 200], [100, 100], [300, 200], [150, 200], [400, 150], [250, 100], [225, 130], [170, 175], [230, 200], [125, 150]];
    _.map(pts, function(pt){cu.draw_point(pt)});

/*
    _.map(triangulate(pts), function(segment) {
        cu.draw_segment(segment);
    });
    */

    quickhull(pts);

});

function quickhull(pts) {
    // segment connection left-most to right-most points
    var initial_segment = arr_mosts(pts, [
        function(pt) {return -pt[0]}, // left most
        function(pt) {return pt[0]}   // right most
    ]);

    console.debug(initial_segment);

    // find the point above and below the initial segment that is furthest away
    var above_and_below_ext = arr_mosts(pts, [
        function(pt) {return signed_segment_right_angle_distance(initial_segment, pt)},
        function(pt) {return -signed_segment_right_angle_distance(initial_segment, pt)}
    ]);

    console.debug(above_and_below_ext);

    var above = above_and_below_ext[0];
    var below = above_and_below_ext[1];

    var above_dist = signed_segment_right_angle_distance(initial_segment, above);
    var below_dist = signed_segment_right_angle_distance(initial_segment, below);

    var convex_hull;

    // deal with cases where the initial segment is the bottom or top of the point set
    if (above_dist <= 0) {
        convex_hull = [initial_segment, [initial_segment[1], below], [below, initial_segment[1]]]
    } else if (below_dist >= 0) {
        convex_hull = [segment_flip(initial_segment), [initial_segment[0], above], [above, initial_segment[1]]];
    } else {
        // usual case - use both vertical extremes
        convex_hull = [[initial_segment[0], above], [above, initial_segment[1]], [initial_segment[1], below], [below, initial_segment[0]]];
    }
    console.debug(JSON.stringify(convex_hull));
    convex_hull.map(function(s){cu.draw_segment(s)});
}

function sort_left_to_right(pts) {
    // sort the array of points in order of increasing x coord with y coord breaking ties
    var sorted_pts = pts.slice(0); // make a copy of the point list
    sorted_pts.sort(function(a, b) {
        if (a[0] == b[0]) {
            return a[1] - b[1];
        } else {
            return a[0] - b[0];
        }
    });

    return sorted_pts;
}

function triangulate(pts) {
    console.debug(pts);
    
    var sorted_pts = sort_left_to_right(pts);

    return triangulate_sorted(sorted_pts, 1);
}

var colour_debug = new ColourDebugger(["red", "green", "blue", "yellow", "purple", "grey"]);

/*
 * The recursive function that computes the triangulation of a sorted array of points.
 * Returns an array of segments constituting the triangulation.
 */
function triangulate_sorted(sorted_pts, depth) {
    //console.debug(sorted_pts.length);
    switch(sorted_pts.length) {
        case 0:
        case 1:
            return [];
        case 2:
            return [ [sorted_pts[0], sorted_pts[1]] ];
        case 3:
            return [ 
                        [sorted_pts[0], sorted_pts[1]],
                        [sorted_pts[1], sorted_pts[2]],
                        [sorted_pts[2], sorted_pts[0]],
                   ];
        default:

            var left = arr_left_half(sorted_pts);
            var right = arr_right_half(sorted_pts);

            var delaunay_left = triangulate_sorted(left, depth + 1);
            var delaunay_right = triangulate_sorted(right, depth + 1);
            
            console.debug(depth);

            _.map(delaunay_left, function(segment) {cu.draw_segment(segment, colour_debug.get_colour(), depth*4)});
            colour_debug.next_colour();
            _.map(delaunay_right, function(segment) {cu.draw_segment(segment, colour_debug.get_colour(), depth*4)});
            colour_debug.next_colour();
                                            

            var ret = dewall_merge(delaunay_left, delaunay_right);

            return ret;
    }

}

/*
 * Returns a line segment which is the bottom-most tangent to the point sets.
 */
function bottom_tangent(left, right) {

}


/*
 * Takes two lists of segments representing the delaunay triangulation of two halves
 * of a point set and computes the delaunay triangulation of the entire point set.
 */
function dewall_merge(left, right) {

    

}
