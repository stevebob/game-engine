function CollisionProcessor(segs) {
    this.segs = segs;
}

CollisionProcessor.Result = function(start, end, collision) {
    this.start = start;
    this.end = end;
    this.seg = [start, end];
    this.collision = collision;
}

CollisionProcessor.prototype.get_collision = function(start, end, rad) {
    var candidates = this.segs.map(function(s) {
        return this.edge_intersection(start, end, rad, s)
    }.bind(this)).concat(this.segs.map(function(s) {
        return this.vertex_intersection(start, end, rad, s)
    }.bind(this))).filter(function(c) {
        return c != null;  
    });

    if (candidates.length == 0) {
        // no collision occured
        return null;
    }
    
    // closest collision to start
    var first = candidates.most(function(c) {
        return -c.path[0].v2_dist(start);
    });
 
    return first;
}

CollisionProcessor.prototype.process = function(start, end, rad) {
    var collision = this.get_collision(start, end, rad);
    if (collision == null) {
        console.debug('no collision');
        return end;
    }

    // compute the path for resolving the collision
    var path = collision.slide();

    console.debug('checking path for collisions');
    for (var i = 1;i<path.length;i++) {
        var seg_start = path[i-1];
        var seg_end = path[i];

        var seg_collision = this.get_collision(seg_start, seg_end, rad);
        
        cu.draw_circle([seg_start, rad], 'grey', 1);
        if (seg_collision != null) {
            cu.draw_circle([seg_end, rad], 'orange', 4);
            cu.draw_circle([seg_start, rad], 'red', 4);
            // the slide has collided with another segment
            console.debug('slide collision');
            console.debug(seg_collision);
            cu.draw_point(seg_collision.end, 'green', 4);
            //return path[i];
        }
    }
    
    console.debug('collision');
    console.debug(path);

    return path[path.length-1];
}

CollisionProcessor.Collision = function(start, end, rad, seg, centre) {
    this.centre = centre;
    this.path = [centre];
    this.start = start;
    this.end = end;
    this.rad = rad;
    this.seg = seg;
}

CollisionProcessor.Collision.prototype.draw_path = function() {
    for (var i = 0;i<this.path.length;++i) {
        cu.draw_circle([this.path[i], this.rad], 'black', 1);
    }
}

CollisionProcessor.EdgeCollision = function(start, end, rad, seg, centre, to_collision) {
    CollisionProcessor.Collision.call(this, start, end, rad, seg, centre);
    this.to_collision = to_collision;
}
CollisionProcessor.EdgeCollision.inherits_from(CollisionProcessor.Collision);

CollisionProcessor.VertexCollision = function(start, end, rad, seg, centre, vertex) {
    CollisionProcessor.Collision.call(this, start, end, rad, seg, centre);
    this.vertex = vertex;
}
CollisionProcessor.VertexCollision.inherits_from(CollisionProcessor.Collision);

/* 
 * Returns the position at which the circle moving from being centred at
 * start to being centred at end, stops after intersecting the edge of seg, or null if
 * no such intersection occurs.
 */
CollisionProcessor.prototype.edge_intersection = function(start, end, rad, seg) {
    /* find point on circle at the start that will first touch the segment
     * if the collision is with the edge (and not one of the vertices).
     */
    var circle_edge_collision_point = [start, rad].circ_closest_pt_to_seg(seg);
    //cu.draw_point(circle_edge_collision_point, 'red', 6);

    /* a vector representing the path from start to end
     */
    var path_vector = end.v2_sub(start);

    /* segment from the edge collision point on the start circle to the corresponding
     * point on the end circle
     */
    var circle_edge_collision_point_path_seg = [circle_edge_collision_point, circle_edge_collision_point.v2_add(path_vector)];
    //cu.draw_segment(circle_edge_collision_point_path_seg, 'red', 2);

    /* point on seg at which an edge collision will occur, if an
     * edge collision is going to occur
     */
    var seg_edge_collision_point = seg.seg_intersection_exclusive(circle_edge_collision_point_path_seg);
    if (seg_edge_collision_point == null) {
        return null;
    }
    //cu.draw_point(seg_edge_collision_point, 'red', 6);
    var test = [start, end].seg_closest_pt_to_v(seg_edge_collision_point);
    //cu.draw_point(test, 'red', 6);
    //console.debug(seg_edge_collision_point.v2_dist(test));

    if (seg_edge_collision_point.v2_dist(test) >= (rad - 0.01)) {
        return null;
    }


    /* vector from centre of start circle to the circle edge collision point
     */
    var start_to_circle_edge_collision_point = circle_edge_collision_point.v2_sub(start);

    /* centre of circle intersecting the segment if it is an edge collision */
    var seg_edge_collision_circle_centre = seg_edge_collision_point.v2_sub(start_to_circle_edge_collision_point);
    //cu.draw_circle([seg_edge_collision_circle_centre, rad], 'red', 1);

    return new CollisionProcessor.EdgeCollision(start, end, rad, seg, seg_edge_collision_circle_centre, start_to_circle_edge_collision_point);
}

/*
 * Returns the position at which the circle moving from being centred at
 * start to being centred at end, stops after intersecting a vertex of seg, or null if
 * no such intersection occurs.
 */
CollisionProcessor.prototype.vertex_intersection = function(start, end, rad, seg) {
    /* the circles with centres of each vertex of radius rad
     */
    var vertex_circles = seg.map(function(v){return [v, rad]});
    //vertex_circles.map(function(c){cu.draw_circle(c, 'green', 1)});

    /* segment starting at start and finishing at end
     */
    var path_seg = [start, end];


    //cu.draw_line(path_seg.seg_to_line());
    //cu.draw_segment(path_seg, 'black', 4);
    //console.debug(path_seg.seg_to_line().line_circle_intersections(vertex_circles[1]));

    /* points of interesction between the path segment and both the circles
     */
    var circle_intersection_points = vertex_circles.map(function(c, i) {
        return path_seg.seg_circle_intersections_exclusive(c);
    });
    //console.debug(circle_intersection_points);
    //circle_intersection_points.map(function(arr){arr.map(function(v){cu.draw_point(v, 'green', 4)})});

    /* early exit if there are no circle intersection points */
    if (circle_intersection_points[0].length == 0 && circle_intersection_points[1].length == 0) {
        return null;
    }

    var shortest_distance = -1;
    var closest_intersection_point;
    var closest_vertex;
    for (var i = 0;i!=2;++i) {
        var arr = circle_intersection_points[i];
        for (var j = 0;j!=arr.length;++j) {
            var dist = arr[j].v2_dist(start);
            if (shortest_distance == -1 || dist < shortest_distance) {
                shortest_distance = dist;
                closest_intersection_point = arr[j];
                closest_vertex = seg[i];
            }
        }
    }

    var closest_circle = [closest_vertex, rad];
//    cu.draw_circle(closest_circle, 'green', 1);
    var path_line = path_seg.seg_to_line();
    var circle_points = path_line.line_circle_intersections_exclusive(closest_circle);
    if (circle_points[0].v2_dist(circle_points[1]) < 0.01) {
        return null;
    }

    //console.debug(closest_intersection_point.v2_dist(seg[1]));
    //cu.draw_point(closest_intersection_point, 'black', 8);
    //cu.draw_circle([closest_intersection_point, rad], 'blue', 2);

    return new CollisionProcessor.VertexCollision(start, end, rad, seg, closest_intersection_point, closest_vertex);
}

CollisionProcessor.EdgeCollision.prototype.slide = function() {
    var start = this.start;
    var end = this.end;
    var rad = this.rad;
    var seg = this.seg;

    /* point in line with seg that is closest ot the end point */
    var end_projection_on_seg = seg.seg_closest_pt_to_v(end);
    //cu.draw_point(end_projection_on_seg, 'orange', 6);

    if (seg.seg_contains_v2_on_line_exclusive(end_projection_on_seg)) {

        var projected_centre = end_projection_on_seg.v2_sub(this.to_collision);
        //cu.draw_circle([projected_centre, rad], 'orange', 2);

        this.path.push(projected_centre);

        return this.path;
    }
    
    var mid = seg.seg_mid();
    var closest_end = end_projection_on_seg.v2_sub(mid).v2_to_length(seg.seg_length()/2).v2_add(mid);
//    cu.draw_point(closest_end, 'red', 4);

    var centre_at_closest_end = closest_end.v2_sub(this.to_collision);
//    cu.draw_circle([centre_at_closest_end, rad], 'orange', 2);
    
    var remaining_trajectory_vector = end.v2_sub(centre_at_closest_end);
//    cu.draw_segment([centre_at_closest_end, centre_at_closest_end.v2_add(remaining_trajectory_vector)]);

    return this.vertex_slide(centre_at_closest_end, end, centre_at_closest_end, closest_end);
}

CollisionProcessor.VertexCollision.prototype.slide = function() {
    return this.vertex_slide(this.start, this.end, this.centre, this.vertex);
}

CollisionProcessor.Collision.prototype.vertex_slide = function(start, end, centre, vertex) {

    var total_distance = start.v2_dist(end);
    
    var pre_collision_distance = start.v2_dist(centre);

    var remaining_distance = total_distance - pre_collision_distance;



    /* after traveling the remaining distance, we should either be just
     * touching the vertex or have moved fully past it
     */

    /* vector from start position to the vertex involved in the collision
     */
    var start_to_vertex = vertex.v2_sub(centre);

    /* tangent to the circle at the intersection point
     */
    var tangent_at_vertex = [vertex, start_to_vertex.v2_norm()];
    //cu.draw_line(tangent_at_vertex, 'purple');

    /* vector from start to end
     */
    var start_to_end_vector = end.v2_sub(start);

    /* a line through the start and end points 
     */
    var start_to_end_line = [start, start_to_end_vector];
    //cu.draw_line(start_to_end_line, 'red');

    //cu.draw_circle([centre, rad], 'black', 1);

    var centre_to_intersection = vertex.v2_sub(centre);

    /* vector nomal to the the direction of movement with the same
     * length as the radius
     */
    var normal_vector = start_to_end_vector.v2_norm().v2_to_length(this.rad);
    var normal_vector_towards_intersection = 
        [normal_vector, normal_vector.v2_invert()].most(function(v) {
            return v.v2_dot(centre_to_intersection)
        });

    /* the tangent on the appropriate side
     */
    var current_tangent = [normal_vector_towards_intersection.v2_add(centre), start_to_end_vector];
    

    //cu.draw_point(normal_vector_towards_intersection.v2_add(centre), 'green', 6);
    //cu.draw_line(current_tangent, 'red', 1);

    /* intersection between the tangent at the vertex and the tangent we
     * just calculated
     */
    var current_tangent_vertex_tangent_intersection = current_tangent.line_intersection(tangent_at_vertex);
    //cu.draw_point(current_tangent_vertex_tangent_intersection, 'purple', 6);

    /* vector to move the circle along the tangent to resolve the collision
     */
    var vertex_tangent_vector_to_move = vertex.v2_sub(current_tangent_vertex_tangent_intersection);
    var current_tangent_vector_to_move = current_tangent_vertex_tangent_intersection.v2_sub(current_tangent[0]);

    /* new centre that avoids the collision
     */
    var vertex_adjusted_centre = centre.v2_add(vertex_tangent_vector_to_move);
    //cu.draw_segment([centre, vertex_adjusted_centre]);
    
    var current_adjusted_centre = vertex_adjusted_centre.v2_add(current_tangent_vector_to_move);

    var move_distance = centre.v2_dist(current_adjusted_centre);
    //console.debug(move_distance);

    if (move_distance < remaining_distance) {
        console.debug('simple case');
        this.path.push(vertex_adjusted_centre);
        this.path.push(current_adjusted_centre);
        //cu.draw_circle([vertex_adjusted_centre, this.rad], 'black', 1);
        //cu.draw_circle([current_adjusted_centre, this.rad], 'black', 1);

        remaining_distance -= move_distance;

        var adjusted_end = current_adjusted_centre.v2_add(start_to_end_vector.v2_to_length(remaining_distance));
        this.path.push(adjusted_end);
        //cu.draw_circle([adjusted_end, this.rad], 'black', 1);

        return this.path;
    }
    console.debug('complex case');


    var ratio = remaining_distance / move_distance;
    //console.debug(ratio);

    //cu.draw_segment([vertex_adjusted_centre, current_adjusted_centre], 'red');
//    cu.draw_circle([vertex_adjusted_centre, this.rad]);
    //cu.draw_circle([current_adjusted_centre, this.rad], 'red', 2);

    var current_angle = centre.v2_sub(vertex).v2_angle();
    var adjusted_angle = current_adjusted_centre.v2_sub(vertex).v2_angle();
    var interpolated_angle = angle_normalize(current_angle + angle_normalize(adjusted_angle - current_angle) * ratio);
    
    var interpolated_destination = angle_to_unit_vector(interpolated_angle).v2_to_length(this.rad).v2_sub(centre.v2_sub(vertex));

    var m = Algebra.equation_solve_2(
                vertex_tangent_vector_to_move,
                current_tangent_vector_to_move,
                interpolated_destination
            );

    var x = vertex_tangent_vector_to_move.v2_smult(m[0]);
    var y = current_tangent_vector_to_move.v2_smult(m[1]);

    var x_moved = centre.v2_add(x);
    var y_moved = x_moved.v2_add(y);

    this.path.push(x_moved);
    this.path.push(y_moved);

 
    return this.path;
}
