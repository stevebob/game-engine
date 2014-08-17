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
//    var pts = [];
    var midx = 200;
    var left = [];
    var right = [];
    $(document).click(function() {
        var pt = Input.get_mouse_pos();
        
        if (pt[0] > midx) {
            right.push(pt);
        } else {
            left.push(pt);
        }
        
        cu.clear();

        cu.draw_segment([[midx, 0], [midx, 10]], "black", 1);

        left.map(function(x) {cu.draw_point(x, "red")});
        right.map(function(x) {cu.draw_point(x, "blue")});

        if (left.length > 2) {
            quickhull(left).map(function(seg) {cu.draw_segment(seg)});
        }

        if (right.length > 2) {
            quickhull(right).map(function(seg) {cu.draw_segment(seg)});
        }

        if (left.length > 0 && right.length > 0) {
            var t = tangents_to_point_sets(left, right);
            cu.draw_segment(t[0], "black", 2);
        }
    });
/*
    var pts = [[100, 50], [100, 100], [300, 150], [100, 200], [400, 140], [250, 100], [225, 130], [170, 195], [230, 50], [125, 150], [255, 25]];
    //pts = pts.map(function(pt){return [pt[0], 300 -pt[1]]});

    var sorted = sort_left_to_right(pts);

    var left = arr_left_half(sorted);
    var right = arr_right_half(sorted);
*/

    var left = [[100, 100], [100, 200]];
    var right = [[150, 100], [140, 150]];
    left.map(function(pt){cu.draw_point(pt, "red")});
    right.map(function(pt){cu.draw_point(pt, "blue")});

    var bt = tangents_to_point_sets(left, right);

    cu.draw_segment(bt[0], "green", 1);
    cu.draw_segment(bt[1], "orange", 1);
//    cu.draw_segment(bt);

/*
    _.map(triangulate(pts), function(segment) {
        cu.draw_segment(segment);
    });
*/
/*
    var ch = quickhull(pts);
    console.debug(ch);
    ch.map(function(seg){cu.draw_segment(seg)});
*/
});

/* computes the partial convex hull for a given segment and
 * array of points where all points must be above the segment
 * using the quickhull divide and conquer stategy.
 * Returns an array of segments constituting the convex hull.
 */
function qh_seg(seg, pts) {

    // if there are no more points the ch is complete
    if (pts.length == 0) {
        return [seg];
    }

    // this will hold the distance to each point
    var distances = new Array(pts.length);

    // find the furthest point from the segment
    var next = arr_most(pts, function(pt) {
        return signed_segment_right_angle_distance(seg, pt)
    }, distances);

    // the left and right sub-segments
    var left = [seg[0], next];
    var right = [next, seg[1]];

    // points above the left and right sub-segments
    var left_pts = pts.filter(function(pt) {
        return signed_segment_right_angle_distance(left, pt) > 0
    });
    
    var right_pts = pts.filter(function(pt) {
        return signed_segment_right_angle_distance(right, pt) > 0
    });

    return qh_seg(left, left_pts).concat(qh_seg(right, right_pts));
}

function quickhull(pts) {
    // segment connecting left-most to right-most points
    var initial_segment = arr_mosts(pts, [
        function(pt) {return -pt[0]}, // left most
        function(pt) {return pt[0]}   // right most
    ], [
        function(cur, best) {return cur[1] < cur[1]},
        function(cur, best) {return cur[1] >= cur[1]}
    ]);

    var above_pts = points_above_segment(initial_segment, pts);
    var below_pts = points_below_segment(initial_segment, pts);

    var above_hull = qh_seg(initial_segment, above_pts);
    var below_hull = qh_seg(segment_flip(initial_segment), below_pts);

    return above_hull.concat(below_hull);

}

/*
 * Returns a line segment which is the bottom-most tangent to the point sets.
 */
function tangents_to_point_sets(left, right) {

    var tangents = [];

    var left_hull = quickhull(left);
    var right_hull = quickhull(right);
    
    var hull = quickhull(left.concat(right));
    
    cu.draw_segment(hull[0], "blue", 2);

    var left_idx = 0;
    while (segment_equals(arr_ring(hull, left_idx), arr_ring(left_hull, left_idx))) {
        ++left_idx;
    }
    
    tangents.push(arr_ring(hull, left_idx));
    left_idx = -1;
    while (segment_equals(arr_ring(hull, left_idx), arr_ring(left_hull, left_idx))) {
        --left_idx;
    }
    tangents.push(arr_ring(hull, left_idx));

    return tangents;

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
 * Takes two lists of segments representing the delaunay triangulation of two halves
 * of a point set and computes the delaunay triangulation of the entire point set.
 */
function dewall_merge(left, right) {

    

}
