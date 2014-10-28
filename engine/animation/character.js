function Character() {}
Character.prototype.images = function(base, o) {
    if (o == undefined) {
        o = base;
        base = '';
    }
    this.image_description = o;
    this.image_url_base = base;

    this.image_data = {};
    var image_loaders = [];
    for (var name in o) {
        var desc = o[name];
        var loader = new SingleImageLoader(base + desc[0]);
        image_loaders.push(loader);
        this.image_data[name] = {
            image: loader.image,
            translate: desc[1],
            size: desc[2],
            clip_start: desc[3],
            clip_size: desc[4]
        };
    }

    this.image_loader = new AsyncGroup(image_loaders);
}

/* 
 * Creates the drawer.image objects for each image.
 * Must be called after images have loaded.
 */
Character.prototype.process_images = function() {
    this.image_closures = {};
    for (var name in this.image_data) {
        var data = this.image_data[name];
        this.image_closures[name] = this.drawer.image(
            data.image,
            data.translate,
            data.size,
            data.clip_start,
            data.clip_size
        );
    }
}

/*
 * Returns a new BodyPart from a given description.
 * Must be called after images have loaded and 
 * process_images has been called.
 */
Character.prototype.body_part_from_description = function(desc, state_name) {
    switch (desc.constructor) {
        case String:
            // an image key only - use a constant image with no movement
            return new BodyPart(
                new ConstantValue(new ImageWrapper(this.image_closures[desc]))
            );
        case Object:
            if (desc.copy) {
                var state = this.state_table[state_name];
                var ref = state[desc.copy];
                var ret = ref;
                if (desc.flip_x) {
                    ret = ret.flip_x();
                }
                if (desc.offset != undefined) {
                    ret = ret.clone_with_offset(desc.offset);
                }
                return ret;
            } else {
                var image;
                if (desc.image == undefined) {
                    image = null;
                } else if (desc.image.constructor == String) {
                    image = new ConstantValue(new ImageWrapper(this.image_closures[desc.image]));
                } else if (desc.image.constructor == Array) {
                    var images = desc.image.map(function(x){return [x[0], this.image_closures[x[1]]]}.bind(this));
                    image = new Interpolator(ImageWrapper.from_seq(images));
                }
                
                var translate;
                if (desc.translate == undefined) {
                    translate = null;
                } else if (desc.translate[0].constructor == Array) {
                    translate = new Interpolator(VectorWrapper.from_seq(desc.translate));
                } else {
                    translate = new ConstantValue(new VectorWrapper(desc.translate));
                }
                
                var rotate;
                if (desc.rotate == undefined) {
                    rotate = null;
                } else if (desc.rotate.constructor == Array) {
                    rotate = new Interpolator(AngleWrapper.from_seq(desc.rotate));
                } else {
                    rotate = new ConstantValue(new AngleWrapper(desc.rotate));
                }
                
                var scale;
                if (desc.scale == undefined) {
                    scale = null;
                } else if (desc.scale[0].constructor == Array) {
                    scale = new Interpolator(VectorWrapper.from_seq(desc.scale));
                } else {
                    scale = new ConstantValue(new VectorWrapper(desc.scale));
                }

                return new BodyPart(image, translate, rotate, scale);
            }
    }
            
}

Character.prototype.states = function(o) {
    this.state_description = o;
}

Character.prototype.process_states = function() {
    this.state_table = {};
    for (var state_name in this.state_description) {
        var state = this.state_description[state_name];
        this.state_table[state_name] = {};
        for (var part_name in state) {
            var desc = state[part_name];
            this.state_table[state_name][part_name] = this.body_part_from_description(desc, state_name);
       }
    }
    this.generate_seqs();
}
Character.prototype.generate_seqs = function() {
    this.seqs = {};
    for (var state_name in this.state_table) {
        this.seqs[state_name] = {};
        for (var part_name in this.state_table[state_name]) {
            var part = this.state_table[state_name][part_name];
            var seq = this.seqs[state_name];
            seq[part_name+'_i'] = part.image;
            seq[part_name+'_t'] = part.translate;
            seq[part_name+'_r'] = part.rotate;
            seq[part_name+'_s'] = part.scale;
        }
    }
}
Character.prototype.create_sequence_manager = function(initial) {
    return new SequenceManager(this.seqs[initial]);
}
Character.prototype.create_scene_graph = function(sequence_manager) {
    return new SceneGraph(this.drawer, sequence_manager, this.scene_graph_root,
                            this.scene_graph_before_description,
                            this.scene_graph_after_description
    );
}

Character.prototype.scene_graph_replace = function(o) {
    for (var i in o) {
        var current = o[i];
        if (current.constructor == Array) {
            this.scene_graph_replace(current);
        } else if (current.constructor == Object) {
            if (current.with_img) {
                current.with_img = this.image_closures[current.with_img]
            }
        }
    }
}
Character.prototype.composition = function(root_name, before, after) {
    this.scene_graph_root = root_name;
    this.scene_graph_before_description = before;
    this.scene_graph_after_description = after;
}
Character.prototype.process_composition = function() {
    this.scene_graph_replace(this.scene_graph_before_description);
    this.scene_graph_replace(this.scene_graph_after_description);
}
Character.prototype.set_drawer = function(drawer) {
    this.drawer = drawer;
    return this;
}

Character.prototype.run = function(then) {
    this.image_loader.run(function() {

        this.process_images();
        this.process_states();
        this.process_composition();
        
        then();
    }.bind(this));
    return this;
}

Character.prototype.instance = function(initial) {
    return new Character.Instance(this, initial);
}

Character.Instance = function(character, initial) {
    this.sm = character.create_sequence_manager(initial);
    this.sg = character.create_scene_graph(this.sm);
    this.character = character;
}
Character.Instance.prototype.tick = function(time_delta) {
    this.sm.tick(time_delta);
}
Character.Instance.prototype.draw_at = function(translate, rotate, scale) {
    this.sg.draw_at(translate, rotate, scale);
}
Character.Instance.prototype.draw = function() {
    this.sg.draw();
}
Character.Instance.prototype.update = function(seq_name, duration, offset) {
    this.sm.update(this.character.seqs[seq_name], duration, offset);
}

