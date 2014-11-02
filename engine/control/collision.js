function CollisionProcessor(rad, segs) {
    this.rad = rad;
    this.segs = segs;
    for (var i = 0;i<segs.length;++i) {
        segs[i].id = i;
    }
}

CollisionProcessor.prototype.process_collision = function(start, end, to_ignore, slide) {
    slide = slide != undefined ? slide : true;
    to_ignore = to_ignore != undefined ? to_ignore : [];

    var valid_segs = this.segs.filter(function(s){return !to_ignore[s.id]});
    if (valid_segs.length == 0) {
        return end;
    }
    var collisions = valid_segs.map(function(s){
        return this.find_collision_path(start, end, s, slide);
    }.bind(this));

    var idx = collisions.most_idx(function(path) {
        if (path._overlap) {
            return 1;
        } else {
            return -this.get_collision_path_length(path);
        }
    }.bind(this));


    var seg = valid_segs[idx];
    var path = collisions[idx].map(function(pt){return pt.v2_to_ints()});

    // the first collision is with seg, and follows path

    // handle simple case by returning destination
    if (path.length == 2) {
        return path[1];
    } else if (path.length == 3) {
        // handle slide case by checking for collisions along slide
        to_ignore[seg.id] = true;
        return this.process_collision(path[1], path[2], to_ignore, false);
    }

    alert("invalid collision path");
}

CollisionProcessor.prototype.get_collision_path_length = function(path) {
    return path[0].v2_dist(path[1]);
}

/* compute the centre of the circle at which the movement of a circle centred
 * at start would stop on its way to being centred at end by colliding with seg */
CollisionProcessor.prototype.find_collision_path = function(start, end, seg, slide) {
    // find closest point on seg's line to end
    var closest_to_end = seg.seg_closest_pt_to_v(end); // closest point on line in line with seg to destination

    // closest point on line in line with seg to destination
    var closest_to_start = seg.seg_closest_pt_to_v(start); 
    
    // vector from closest_to_start to start
    var start_overlap_vector = start.v2_sub(closest_to_start); 
    
    // start_overlap_vector scaled to the radius of the collision processor
    var start_offset = start_overlap_vector.v2_to_length(this.rad); 
    
    var seg_half_length = seg.seg_length()/2;
    var mid = seg.seg_mid();

    // end of the segment closest to destination
    var closest_end = mid.v2_add(closest_to_end.v2_sub(mid).v2_to_length(seg_half_length));
    var furthest_end = closest_end.v2_equals(seg[0]) ? seg[1] : seg[0];

    // if the closest point to the start and end are both in the line segment
    if (seg.seg_contains_v2_on_line(closest_to_end) && seg.seg_contains_v2_on_line(closest_to_start)) {
        
        // if the circle as it was at the start overlaps the segment
        if (start.v2_dist(closest_to_start) <= this.rad) {
            // start by moving away from the segment until no longer overlapping
            var moved_away = closest_to_start.v2_add(start_overlap_vector)
            var path = [start, moved_away];

            // this is used for bookkeeping later on
            path._overlap = true;

            if ((end.v2_dist(closest_to_end) <= this.rad)
               || [start, end].seg_intersects(seg)
            ) {
                var slide_centre = closest_to_end.v2_add(start_offset);
                path.push(slide_centre);
            } else {
                // slide the start so it's no longer overlapping and take path to end
                path.push(end);
            }
            return path;
        }
    
    }

     // if the destination is closer to the segment end closest to the destination than the radius
    if (end.v2_dist(closest_end) <= this.rad) {

        if (angle_through(end, closest_end, furthest_end) >= Math.PI/2 &&
            angle_through(furthest_end, closest_end, end) >= Math.PI/2) {
            
            // line through closest end and destination
            var move_line = [closest_end, end].seg_to_line();

            var candidates = move_line.line_circle_intersections([closest_end, this.rad]);
            var dest_mid = candidates.most(function(pt){return -pt.v2_dist(end)})
            return [start, dest_mid];
        }
    }
   
    if (start.v2_dist(closest_end) <= this.rad) {
        return [start, end];
    }


    // point on start that will eventually intersect seg
    var pt_will_collide = [start, this.rad].circ_closest_pt_to_seg(seg);

    // vector from start to end
    var move_v = end.v2_sub(start);

    // line through start and end
    var move_line = [end, move_v];

    // line through pt_will_collide in direction of movement
    var collide_line = [pt_will_collide, move_v];
    
    // point in line with seg at which an edge collision may occur
    var intersection_pt = collide_line.line_intersection(seg.seg_to_line());
    
    if (intersection_pt == null) {
        return [start, end];
    }
    // boolean value true if edge collision has occured
    var edge_collision = seg.seg_contains_v2_on_line(intersection_pt);
    // vector from pt_will_collide to centre of start
    var offset = start.v2_sub(pt_will_collide);
    var candidates = [];
    if (edge_collision) {
        var dest_centre = intersection_pt.v2_add(offset);
        dest_centre._simple = true;
        candidates.push(dest_centre);
    }

    // check if closest points to centre of start is inside start
    var close_vertices = seg.filter(function(pt){
        var closest = [pt, move_v].line_closest_pt_to_v(start);
        return closest.v2_dist(start) < this.rad;
    }.bind(this));

    var vertex_collision_points = close_vertices.map(function(pt){
        var circle_ints = move_line.line_circle_intersections([pt, this.rad]);
        return circle_ints.most(function(m){return -m.v2_dist(start)})
    }.bind(this));

    candidates = candidates.concat(vertex_collision_points);
    
    var stop_centre = null;
    if (candidates.length > 0) {
        var dest_centre = candidates.most(function(v){return -start.v2_dist(v)});
        var start_to_end = [start, end];
        if (start_to_end.seg_contains_v2_on_line(dest_centre) && start.v2_dist(end) > start.v2_dist(dest_centre)) {
            stop_centre = dest_centre;
        }
    }

    // no collision has occured, proceed as normal
    if (stop_centre == null) {
        return [start, end];
    }

    var moves = [start, stop_centre];

    // corner collision, don't attempt to slide
    if (!stop_centre._simple || !slide) {
        return moves;
    }

    var slide_centre = closest_to_end.v2_add(offset);
    moves.push(slide_centre);
    return moves;
}

