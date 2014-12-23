var vis;
var scroll;
var circle;
var t;
var drawer;
var game_console;
var agent;
var cu;
var test_texture1;
var test_texture2;
var canvas;

$(function() {

    game_console = new Console(
        document.getElementById("console-input"),
        document.getElementById("console-output"),
        new Echoer()
    );
    game_console.setup_keys();
    $("#console-container").hide();
    $("#info-overlay").hide();

    var fps_stats = new Stats();
    fps_stats.setMode(0);
    fps_stats.domElement.style.position = 'relative';
    fps_stats.domElement.style.float = 'left';
    document.getElementById('info-overlay').appendChild(fps_stats.domElement);
    var ms_stats = new Stats();
    ms_stats.setMode(1);
    ms_stats.domElement.style.position = 'relative';
    document.getElementById('info-overlay').appendChild(ms_stats.domElement);


    Input.set_canvas_offset(parseInt($("#screen").css("left")), parseInt($("#screen").css("top")));
    Input.init();
    var pos = [2400, 3300];
    agent = new Agent(pos, 0);

    canvas = document.getElementById('screen');
    
    $(document).resize(function() {
        canvas.width = $(window).width();
        canvas.height = $(window).height();
    });

    canvas.width = $(window).width();
    canvas.height = $(window).height();
    if (window.location.hash == '#canvas') {
        drawer = new CanvasDrawer(canvas);
        cu = new CanvasUtil(canvas);
    } else {
        drawer = new WebGLDrawer(canvas);
    }
    drawer.update_resolution();
   

    Content.load();
    Content.set_drawer(drawer);
    
    new AsyncGroup(
        new FileLoader('shaders/', ['standard_vertex_shader.glsl', 'standard_fragment_shader.glsl']),
        Content
        ,new ImageLoader('artwork/shaders/irregular_pavement/', [
            'irregular_pavement.png', 
            'irregular_pavement_bumpmap.png',
            'irregular_pavement_lightmap.png',
            'irregular_pavement_shinemap.png'
        ])
    ).run(function(shaders, images, test_images) {
        
        drawer.standard_shaders(shaders[0], shaders[1]);
        drawer.init_uniforms();

        var test_image = drawer.phong_illuminated_image(test_images[0], test_images[1], test_images[2], test_images[3], [200, 200], [128, 128]);
        //test_texture1 = drawer.glm.texture(test_images[0]);

        var map_demo = Content.maps.dungeon1;
        
        map_demo.update_lights();

        var demo = Content.characters.warrior.instance('still');
        agent.enter_region(map_demo.region_hash.west);
        agent.enter_level(map_demo.level_hash.level1);
        
        var filterer = drawer.filter_pipeline([0, 0], [canvas.width, canvas.height]);
        
        if (window.location.hash == '#pixelate') {
            filterer.set_filters(drawer.pixelate_filter(3));
        }

        var capture = drawer.capture([0, 0], [canvas.width, canvas.height]);

        var bump_map_capture = drawer.capture([0, 0], [canvas.width, canvas.height]);
        var light_map_capture = drawer.capture([0, 0], [canvas.width, canvas.height]);
        var shine_map_capture = drawer.capture([0, 0], [canvas.width, canvas.height]);

        var phong_capture = drawer.phong_map(
            capture.texture,
            bump_map_capture.texture,
            light_map_capture.texture,
            shine_map_capture.texture,
            true,
            [canvas.width, canvas.height]
        );

        var lighting_capture = drawer.capture([0, 0], [canvas.width, canvas.height]);
        var visible_capture = drawer.capture([0, 0], [canvas.width, canvas.height]);
        circle = drawer.circle([0, 0], agent.rad, [0,0,0,0.5]);

        var dradial = drawer.dynamic_radial([100, 100], [], 128, canvas.width, canvas.height);

        var follow_light = drawer.light(1500, [1,1,1,0.5]);
        
        agent.facing = -Math.PI/2;
        agent.move_speed = 400;
        var state = 1;
        var tm = new TimeManager();
       
        scroll = new ScrollContext([0, 0], 300, [$(window).width(), $(window).height()]);
        
//        var background = drawer.sliding_window(agent.level.floor.image, [0, 0], [canvas.width, canvas.height], [0, 0]);

        drawer.sync_buffers();
//        background.draw();
//        return;

        var profile_tm = new TimeManager();

        t = function() {

            fps_stats.begin();
            ms_stats.begin();
            
            var time_delta = tm.get_delta();
            
            var original_position = agent.pos.slice();

            if (state == 0 && agent.absolute_control_tick(time_delta)) {
                state = 1;
                demo.update('walk', 1, -200);
            } else if (state == 1 && !agent.absolute_control_tick(time_delta)) {
                state = 0;
                demo.update('still');
                agent.stop();
            }
     
            // switch current region if necessary
            agent.border_detect();

            // show/hide regions if necessary
            agent.level_detect();

            
            // reset the drawer
            drawer.glm.set_clear_colour([0,0,0,1]);
            drawer.clear();
            drawer.glm.set_clear_colour([0,0,0,1]);
            drawer.remove_filters();
        
            Scene.base(capture, drawer, scroll, agent, demo, map_demo, 'image_texture');
            Scene.base(bump_map_capture, drawer, scroll, agent, demo, map_demo, 'bump_map_texture');
            Scene.base(light_map_capture, drawer, scroll, agent, demo, map_demo, 'light_map_texture');
            Scene.base(shine_map_capture, drawer, scroll, agent, demo, map_demo, 'shine_map_texture');

            Scene.lighting(lighting_capture, drawer, scroll, agent, dradial, follow_light, capture, phong_capture);

            Scene.visible_area(visible_capture, drawer, scroll, agent, dradial, lighting_capture);
            

            // draw the line segments and character

            //filterer.begin();
            
            //drawer.u_opacity.set(0.3);
           // capture.draw();
           // drawer.u_opacity.set(1);
            
            visible_capture.draw();
            
            //filterer.draw();


            var mouse = Input.get_mouse_pos();
            drawer.u_mouse.set([mouse[0], mouse[1]]);

            //test_image.draw();
            
            scroll.proceed();

            // sync the cpu for smooth animation
            drawer.sync_gpu();
            // progress the time
            demo.tick(time_delta);
            // repeat on the next frame
            requestAnimationFrame(t);

            // record some stats
            fps_stats.end();
            ms_stats.end();
        }
        t();


    }.arr_args());
});

function Scene(){}
Scene.base = function(capture, drawer, scroll, agent, character, map, level) {
    // set up gl to draw to a framebuffer
    capture.begin();

    agent.level.floor.set_offset([-scroll.translate[0], -scroll.translate[1]]);
    agent.level.draw_floor_flat(level);
    
    // apply global translation (for scrolling)
    drawer.save();
    
    drawer.translate(scroll.translate);
   
    // draw the map line segments
    //map.draw();
    
    // apply local transformation (for moving the character)
    drawer.save();
    drawer.translate(agent.pos).rotate(agent.facing+Math.PI/2);
    

    // draw the character
    switch(level) {
    case 'image_texture':
        character.draw();
        break;
    case 'bump_map_texture':
        drawer.u_colour_override.set(true);
        drawer.u_colour_override_value.set([0,0,0,1]);
        character.draw();
        drawer.u_colour_override.set(false);
        break;
    case 'light_map_texture':
        drawer.u_colour_override.set(true);
        drawer.u_colour_override_value.set([0.5,1,0,1]);
        character.draw();
        drawer.u_colour_override.set(false);
        break;
    case 'shine_map_texture':
        drawer.u_colour_override.set(true);
        drawer.u_colour_override_value.set([0,0,0,1]);
        character.draw();
        drawer.u_colour_override.set(false);
        break;
    }



    scroll.set_next(drawer.global_centre());
    
    // back to the scroll transformation
    drawer.restore();
    

    // remove all transformations
    drawer.restore();
    
    // capture contains all the line segments and the character
    capture.end();
}

Scene.lighting = function(capture, drawer, scroll, agent, dradial, follow_light, background, phong_capture) {
    drawer.glm.set_clear_colour([0,0,0,1]);
    
    // fill a buffer with all the lit areas
    capture.begin();

    /* draw the original capture into the lighting buffer so when this buffer
     * is used to texture the visible area the original drawing is also present
     */
    
    /*
    drawer.u_opacity.set(0.3);
    background.draw();
    drawer.u_opacity.set(1);
    */

    // translate back to the scroll position
    drawer.save();
    drawer.translate(scroll.translate);
    
    dradial.update(agent.pos, agent.level.visibility_context.visible_polygon(agent.pos.v2_floor()));

    // draw lit areas to a buffer

    drawer.glm.light_blend();
    var lights = agent.level.lights;
    
    
    
    agent.level.lights.map(function(l) {
        //l.draw(background.texture);
//        l.draw(phong_capture.image_texture);
        l.draw_phong(phong_capture);
    });
    

    drawer.glm.disable_blend();
    follow_light.draw_phong_to_buffer_with(background.texture, agent.pos, dradial);
    drawer.glm.enable_blend();
    
    drawer.restore();
 
    capture.bind();
    follow_light.draw_buffer();
    
    drawer.glm.general_blend();

    capture.end();

}

Scene.visible_area = function(capture, drawer, scroll, agent, dradial, background) {
    drawer.glm.set_clear_colour([0,0,0,0]);
    
    capture.begin();
    // translate back to the scroll position
    drawer.save();
    drawer.translate(scroll.translate);
    
    drawer.u_opacity.set(1);

    dradial.draw_no_blend(background.texture);
    
    //drawer.draw_point(agent.pos, tc('black'), 4);

    drawer.restore();

    capture.end();
 
}
